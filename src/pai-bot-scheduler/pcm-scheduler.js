const {PAICodeCommand, PAICodeCommandContext, PAICodeModule, PAICode, PAIModuleConfigParam, PAIModuleConfig, PAILogger, PAIModuleCommandSchema, PAIModuleCommandParamSchema} = require('@pai-tech/pai-code');
const cron = require('node-cron');
const SchedulerTask = require('./src/model/scheduler-task');



function runScheduledTask(entity) {
    PAILogger.info('Start Schedule Task:' + entity._id);
    PAICode.executeString(entity.paiCodeToExecute)
        .then(res => {
            PAILogger.info('End Schedule Task:' + entity._id);
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
            //PAIModuleConfigParam(label, description, paramName, defaultValue)
            // TODO: add configuration parameters
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
            op: "add-task",
            func: "addTask",
            params: {
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
                "interval_pattern": new PAIModuleCommandParamSchema("interval_pattern", "* * * * * * -> second, minute, hour, day of month, month, day of week", false, "Interval Pattern (Cron Job)"),
                "pai_code": new PAIModuleCommandParamSchema("pai_code", "pai-code show version", false, "PAI-CODE to execute"),
                "is_active": new PAIModuleCommandParamSchema("is_active", "true / false", false, "Task is Active ?")
            }
        }));
    
    
        this.loadCommandWithSchema(new PAIModuleCommandSchema({
            op: "get-tasks",
            func: "getTasks"
        }));
    
    
    }
    
    
    setModuleName() {
        return 'pai-scheduler';
    }
    
    /**
     *
     * @param {PAICodeCommand} cmd
     */
    addTask(cmd) {
        
        return new Promise(async (resolve, reject) => {
    
            
            let entity = new SchedulerTask();
            entity.intervalPattern = cmd.params.interval_pattern.value;
            entity.paiCodeToExecute = cmd.params.pai_code.value;
            entity.isActive = (cmd.params.is_active) ? cmd.params.is_active.value : true;
            await this.data.dataSource.save(entity);
            
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
    updateTask(cmd) {
        
        return new Promise(async (resolve, reject) => {
            
            let entity = new SchedulerTask();
            entity = await this.data.dataSource.findById(entity,cmd.params.task_id.value);
            
            this.activeTasks[entity._id].stop();
            delete this.activeTasks[entity._id];
            
            entity.intervalPattern = cmd.params.interval_pattern.value;
            entity.paiCodeToExecute = cmd.params.pai_code.value;
            entity.isActive = (cmd.params.is_active) ? cmd.params.is_active.value : true;
            
            await this.data.dataSource.save(entity);
    
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
    getTasks(cmd) {
        
        return new Promise(async (resolve, reject) => {
            
            let entity = new SchedulerTask();
            let results = await this.data.dataSource.findAll(entity);
            
            resolve(results);
        });
    }
    
}

module.exports = PCM_SCHEDULER;