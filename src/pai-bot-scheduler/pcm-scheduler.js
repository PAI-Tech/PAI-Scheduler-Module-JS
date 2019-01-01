const {PAICodeCommand, PAICodeCommandContext, PAICodeModule, PAICode, PAIModuleConfigParam, PAIModuleConfig, PAILogger, PAIModuleCommandSchema, PAIModuleCommandParamSchema} = require("@pai-tech/pai-code");
const cron = require("node-cron");
const SchedulerTask = require("./src/model/scheduler-task");



function runScheduledTask(entity) {
	PAILogger.info("Start Schedule Task:" + entity._id);
	PAICode.executeString(entity.paiCodeToExecute)
		.then(res => {
			PAILogger.info("End Schedule Task:" + entity._id);
		}).catch(err => {
			PAILogger.error(err);
		});
}


class PCM_SCHEDULER extends PAICodeModule {
	constructor() {
        
		let infoText = `
        Welcome to PAI Scheduler:
        You can write here info text about your module.
        `;
        
		super(infoText);
        
		this.config.schema = [
			/*
			 *PAIModuleConfigParam(label, description, paramName, defaultValue)
			 * TODO: add configuration parameters
			 */
		];
        
        
		let entity = new SchedulerTask();
		this.data.entities[entity.setEntityName()] = SchedulerTask;
        
		this.activeTasks = {};
        
	}
    
    
	/**
	 * load basic module commands from super
	 * and load all the functions for this module
	 */
	async load() {
		await super.load();
		
		this.loadCommandWithSchema(new PAIModuleCommandSchema({
			op: "version",
			func:"version"
		}));
		
		
		this.loadCommandWithSchema(new PAIModuleCommandSchema({
			op: "add-task",
			func: "addTask",
			params: {
				//constructor(paramName,description,isRequired, label, defaultValue) {
				"name": new PAIModuleCommandParamSchema("name", "Ex: Backup task", true, "Task Name"),
				"description": new PAIModuleCommandParamSchema("description", "This task is for ...", true, "Short Description"),
				"interval_pattern": new PAIModuleCommandParamSchema("interval_pattern", "* * * * * * -> second, minute, hour, day of month, month, day of week", true, "Interval Pattern (Cron Job)"),
				"pai_code": new PAIModuleCommandParamSchema("pai_code", "pai-code show version", true, "PAI-CODE to execute"),
				"is_active": new PAIModuleCommandParamSchema("is_active", "true / false", false, "Task is Active ?",true),
			}
		}));
    
    
		this.loadCommandWithSchema(new PAIModuleCommandSchema({
			op: "update-task",
			func: "updateTask",
			params: {
				"task_id": new PAIModuleCommandParamSchema("task_id", "Task id xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx", true, "Task ID to update"),
				"name": new PAIModuleCommandParamSchema("name", "Ex: Backup task", true, "Task Name"),
				"description": new PAIModuleCommandParamSchema("description", "This task is for ...", true, "Short Description"),
				"interval_pattern": new PAIModuleCommandParamSchema("interval_pattern", "* * * * * * -> second, minute, hour, day of month, month, day of week", false, "Interval Pattern (Cron Job)"),
				"pai_code": new PAIModuleCommandParamSchema("pai_code", "pai-code show version", false, "PAI-CODE to execute"),
				"is_active": new PAIModuleCommandParamSchema("is_active", "true / false", false, "Task is Active ?")
			}
		}));
    
    
    
    
		this.loadCommandWithSchema(new PAIModuleCommandSchema({
			op: "delete-task",
			func: "deleteTask",
			params: {
				"task_id": new PAIModuleCommandParamSchema("task_id", "Task id xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx", true, "Task ID to delete"),
			}
		}));
    
    
		this.loadCommandWithSchema(new PAIModuleCommandSchema({
			op: "get-tasks",
			func: "getTasks"
		}));
	
	
		this.loadExistingTasksAfterRestart()
			.then(success => {
				PAILogger.info(this.setModuleName() + " - all tasks loaded");
			})
			.catch(err => {
				PAILogger.error(this.setModuleName() + " - failed to load tasks after restart: " + err.message,err);
			});
	}
    
	async loadExistingTasksAfterRestart() {
	
		let entity = new SchedulerTask();
		let results = await this.data.dataSource.findAll(entity);
	
		for (let i = 0; i < results.records.length; i++) {
			let task = results.records[i];
		
			if(!this.activeTasks[task._id])
			{
				this.activeTasks[task._id] =  cron.schedule(task.intervalPattern, () => {
					runScheduledTask(task);
				} , { scheduled:task.isActive });
			}
		}
		
		return true;
	}
    
	setModuleName() {
		return "pai-scheduler";
	}
	
	
	/**
	 * @param {PAICodeCommand} cmd
	 * @return {Promise<void>}
	 */
	async version(cmd) {
		return require("./../../package").version;
	}
	
	/**
	 *
	 * @param {PAICodeCommand} cmd
	 */
	addTask(cmd) {
        
		return new Promise(async (resolve, reject) => {
    
            
			let entity = new SchedulerTask();
			entity.name = cmd.params.name.value;
			entity.description = cmd.params.description.value;
			entity.intervalPattern = cmd.params.interval_pattern.value;
			entity.paiCodeToExecute = cmd.params.pai_code.value;
			entity.isActive = (cmd.params.is_active) ? cmd.params.is_active.value : true;
			await this.data.dataSource.save(entity);
            
			this.activeTasks[entity._id] =  cron.schedule(entity.intervalPattern, () => {
				runScheduledTask(entity);
			} , { scheduled:entity.isActive });
            
			resolve("task created with id: " + entity._id);
		});
	}
    
    
	/**
	 *
	 * @param {PAICodeCommand} cmd
	 */
	updateTask(cmd) {
        
		return new Promise(async (resolve, reject) => {
            
			let entity = new SchedulerTask();
			let entityList = await this.data.dataSource.findById(entity,cmd.params.task_id.value);
    
			if(!(entityList && entityList.records.length > 0))
				return reject(new Error("ID not find"));
            
			entity = entityList.records[0];
            
			this.activeTasks[entity._id].stop();
			delete this.activeTasks[entity._id];
	
			entity.name = cmd.params.name.value;
			entity.description = cmd.params.description.value;
			entity.intervalPattern = cmd.params.interval_pattern.value;
			entity.paiCodeToExecute = cmd.params.pai_code.value;
			entity.isActive = (cmd.params.is_active) ? cmd.params.is_active.value : true;
            
			await this.data.dataSource.update(entity);
    
			this.activeTasks[entity._id] =  cron.schedule(entity.intervalPattern, () => {
				runScheduledTask(entity);
			} , { scheduled:entity.isActive });
            
			resolve(true);
		});
	}
    
    
	/**
	 *
	 * @param {PAICodeCommand} cmd
	 */
	deleteTask(cmd) {
        
		return new Promise(async (resolve, reject) => {
    
			let entity = new SchedulerTask();
			let entityList = await this.data.dataSource.findById(entity,cmd.params.task_id.value);
    
			if(!(entityList && entityList.records.length > 0))
				return reject(new Error("ID not find"));
    
			entity = entityList.records[0];
    
            
			this.activeTasks[entity._id].stop();
			delete this.activeTasks[entity._id];
            
            
			await this.data.dataSource.delete(entity);
            
			resolve(true);
		});
	}
    
    
	/**
	 *
	 * @param {PAICodeCommand} cmd
	 */
	getTasks(cmd) {
        
		return new Promise(async (resolve, reject) => {
            
			let entity = new SchedulerTask();
			let results = await this.data.dataSource.findAll(entity).catch(err => { reject(err); });
            
			resolve(results);
		});
	}
    
}

module.exports = PCM_SCHEDULER;