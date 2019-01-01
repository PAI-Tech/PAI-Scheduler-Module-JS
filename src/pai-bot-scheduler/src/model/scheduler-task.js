const {PAIEntity} = require("@pai-tech/pai-code");



class SchedulerTask extends PAIEntity {
    
    
	constructor() {
		super();
	
		this.name = null;
		this.description = null;
		this.intervalPattern = null;
		this.paiCodeToExecute = null;
		this.isActive = null;
	}
    
	setEntityName() {
		return "scheduler_task";
	}
}


module.exports = SchedulerTask;