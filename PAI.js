const { PAICodeCommand, PAICodeCommandContext, PAICodeModule, PAICode } = require('@pai-tech/pai-code');
const {   PAIBotModule,    PAIBotManager,    PAIBot,    PAIBotStatus } = require('@pai-tech/pai-bot');
const { Module } = require('./index');


async function start(){
    
    let module = new Module();
    await module.registerModule(); // register the module to PAICode
    
    let context = new PAICodeCommandContext('host','HardCoded');
    await PAICode.executeString(`pai-scheduler add-task interval_pattern:"*/3 * * * * *" pai_code:"pai-code show face"`,context);
    await PAICode.executeString(`pai-scheduler add-task interval_pattern:"*/5 * * * * *" pai_code:"pai-code show face"`,context);
    await PAICode.executeString(`pai-scheduler add-task interval_pattern:"*/10 * * * * *" pai_code:"pai-code show face"`,context);
    await PAICode.executeString(`pai-scheduler add-task interval_pattern:"*/20 * * * * *" pai_code:"pai-code show face"`,context);
    
    let response = await PAICode.executeString(`pai-scheduler get-tasks`,context);
    
    let toPrint = JSON.stringify(response[0].response.data);
    console.log(toPrint);
    
    PAICode.start();
}

start().then().catch(e => {
    console.log(e)
});






