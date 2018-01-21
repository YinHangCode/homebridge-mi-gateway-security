var fs = require('fs');
const miio = require('miio');
var Accessory, Service, Characteristic, UUIDGen;

module.exports = function(homebridge) {
    if(!isConfig(homebridge.user.configPath(), "accessories", "MiGatewaySecurity")) {
        return;
    }

    Accessory = homebridge.platformAccessory;
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    UUIDGen = homebridge.hap.uuid;

    homebridge.registerAccessory('homebridge-mi-gateway-security', 'MiGatewaySecurity', MiGatewaySecurity);
}

function isConfig(configFile, type, name) {
    var config = JSON.parse(fs.readFileSync(configFile));
    if("accessories" === type) {
        var accessories = config.accessories;
        for(var i in accessories) {
            if(accessories[i]['accessory'] === name) {
                return true;
            }
        }
    } else if("platforms" === type) {
        var platforms = config.platforms;
        for(var i in platforms) {
            if(platforms[i]['platform'] === name) {
                return true;
            }
        }
    } else {
    }
    
    return false;
}

function MiGatewaySecurity(log, config) {
    if(null == config) {
        return;
    }

    this.log = log;
    this.config = config;
    
    this.device = new miio.Device({
        address: config.ip,
        token: config.token
    });

}

MiGatewaySecurity.prototype = {
    identify: function(callback) {
        callback();
    },

    getServices: function() {
        var that = this;
        var services = [];

        var securityService = null;
        var switchService = null;
        
        if(!this.config['disable'] && this.config['name'] && this.config['name'] != "") {
            securityService = new Service.SecuritySystem(this.config['name']);
            var securitySystemCurrentStateCharacteristic = securityService.getCharacteristic(Characteristic.SecuritySystemCurrentState);
            securitySystemCurrentStateCharacteristic.setProps({
                validValues: [1,3]
            });
            var securitySystemTargetStateCharacteristic = securityService.getCharacteristic(Characteristic.SecuritySystemTargetState);
            securitySystemTargetStateCharacteristic.setProps({
                validValues: [1,3]
            });
            
            // default value is disarm
            securitySystemTargetStateCharacteristic.value = Characteristic.SecuritySystemTargetState.DISARM;
            securitySystemCurrentStateCharacteristic.value = Characteristic.SecuritySystemCurrentState.DISARMED;
            
            securitySystemCurrentStateCharacteristic
            .on('get', function(callback) {
                that.device.call("get_arming", []).then(result => {
                    var value = null;
                    if(result[0] === 'on') {
                        callback(null, Characteristic.SecuritySystemCurrentState.AWAY_ARM);
                    } else if(result[0] === 'off') {
                        callback(null, Characteristic.SecuritySystemCurrentState.DISARMED);
                    } else {
                        callback(new Error(result[0]));
                    }
                }).catch(function(err) {
                    that.log.error("[MiGatewaySecurity][ERROR]get SecuritySystemCurrentState Error: " + err);
                    callback(err);
                });
            }.bind(this));
            
            securitySystemTargetStateCharacteristic
            .on('get', function(callback) {
                that.device.call("get_arming", []).then(result => {
                    var value = null;
                    if(result[0] === 'on') {
                        callback(null, Characteristic.SecuritySystemTargetState.AWAY_ARM);
                    } else if(result[0] === 'off') {
                        callback(null, Characteristic.SecuritySystemTargetState.DISARM);
                    } else {
                        callback(new Error(result[0]));
                    }
                }).catch(function(err) {
                    that.log.error("[MiGatewaySecurity][ERROR]get SecuritySystemTargetState Error: " + err);
                    callback(err);
                });
            }.bind(this))
            .on('set', function(value, callback) {
                var val = "off";
                if(Characteristic.SecuritySystemCurrentState.AWAY_ARM == value) {
                    val = "on";
                } else if(Characteristic.SecuritySystemCurrentState.DISARMED == value) {
                    val = "off";
                } else {
                    val = "off";
                }
                
                that.device.call("set_arming", [val]).then(result => {
                    if(result[0] === "ok") {
                        callback(null);
                        setTimeout(() => {
                            securitySystemCurrentStateCharacteristic.updateValue(value);
                            if(switchService) {
                                var onCharacteristic = switchService.getCharacteristic(Characteristic.On);
                                onCharacteristic.updateValue("on" == val ? true : false);
                            }
                        }, 10);
                    } else {
                        callback(new Error(result[0]));
                    }
                }).catch(function(err) {
                    that.log.error("[MiGatewaySecurity][ERROR]SecuritySystemTargetState Error: " + err);
                    callback(err);
                });
            }.bind(this));
            
            services.push(securityService);
        }
        
        if(!this.config['switchDisable'] && this.config['switchName'] && this.config['switchName'] != "") {
            switchService = new Service.Switch(this.config['switchName']);
            var onCharacteristic = switchService.getCharacteristic(Characteristic.On);
            
            onCharacteristic
            .on('get', function(callback) {
                that.device.call("get_arming", []).then(result => {
                    var value = null;
                    if(result[0] === 'on') {
                        callback(null, true);
                    } else if(result[0] === 'off') {
                        callback(null, false);
                    } else {
                        callback(new Error(result[0]));
                    }
                }).catch(function(err) {
                    that.log.error("[MiGatewaySecurity][ERROR]get On Error: " + err);
                    callback(err);
                });
            }.bind(this))
            .on('set', function(value, callback) {
                that.device.call("set_arming", [value ? "on" : "off"]).then(result => {
                    if(result[0] === "ok") {
                        callback(null);
                        setTimeout(() => {
                            if(securityService) {
                                var securitySystemTargetStateCharacteristic = securityService.getCharacteristic(Characteristic.SecuritySystemTargetState);
                                securitySystemTargetStateCharacteristic.updateValue(value ? Characteristic.SecuritySystemTargetState.AWAY_ARM : Characteristic.SecuritySystemTargetState.DISARM);
                                setTimeout(() => {
                                    var securitySystemCurrentStateCharacteristic = securityService.getCharacteristic(Characteristic.SecuritySystemCurrentState);
                                    securitySystemCurrentStateCharacteristic.updateValue(value ? Characteristic.SecuritySystemCurrentState.AWAY_ARM : Characteristic.SecuritySystemCurrentState.DISARMED);
                                }, 10);
                            }
                        }, 10);
                    } else {
                        callback(new Error(result[0]));
                    }
                }).catch(function(err) {
                    that.log.error("[MiGatewaySecurity][ERROR]Set On Error: " + err);
                    callback(err);
                });
            }.bind(this));
            
            services.push(switchService);
        }
        
        if(services.length > 0) {
            var infoService = new Service.AccessoryInformation();
            infoService
                .setCharacteristic(Characteristic.Manufacturer, "XiaoMi")
                .setCharacteristic(Characteristic.Model, "Gateway")
                .setCharacteristic(Characteristic.SerialNumber, "Undefined");
            services.push(infoService);
        }
        
        return services;
    }
}

