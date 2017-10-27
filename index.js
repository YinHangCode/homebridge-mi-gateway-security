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
        var services = [];

        var infoService = new Service.AccessoryInformation();
        infoService
            .setCharacteristic(Characteristic.Manufacturer, "XiaoMi")
            .setCharacteristic(Characteristic.Model, "Gateway")
            .setCharacteristic(Characteristic.SerialNumber, "Undefined");
        services.push(infoService);

        var service = new Service.SecuritySystem(this.config['name']);
        var securitySystemCurrentStateCharacteristic = service.getCharacteristic(Characteristic.SecuritySystemCurrentState);
        var securitySystemTargetStateCharacteristic = service.getCharacteristic(Characteristic.SecuritySystemTargetState);
        securitySystemCurrentStateCharacteristic
            .on('get', function(callback) {
                this.device.call("get_arming", [null]).then(result => {
                    var val = result[0] === 'off' ? 
                        Characteristic.SecuritySystemCurrentState.DISARMED : 
                        (securitySystemCurrentStateCharacteristic.value == Characteristic.SecuritySystemCurrentState.DISARMED ? 
                            Characteristic.SecuritySystemCurrentState.AWAY_ARM : 
                            securitySystemCurrentStateCharacteristic.value
                        );
                    securitySystemTargetStateCharacteristic.updateValue(val);
                    callback(null, val);
                }).catch(function(err) {
                    that.log.error("[MiGatewaySecurity][ERROR]get SecuritySystemCurrentState Error: " + err);
                    callback(err);
                });
            }.bind(this));
        securitySystemTargetStateCharacteristic
            .on('set', function(value, callback) {
                var that = this;
                var val = "off";
                if(Characteristic.SecuritySystemCurrentState.STAY_ARM == value) {
                    val = "on";
                } else if(Characteristic.SecuritySystemCurrentState.AWAY_ARM == value) {
                    val = "on";
                } else if(Characteristic.SecuritySystemCurrentState.NIGHT_ARM == value) {
                    val = "on";
                } else if(Characteristic.SecuritySystemCurrentState.DISARMED == value) {
                    val = "off";
                } else {
                    val = "off";
                }
                
                this.device.call("set_arming", [val]).then(result => {
                    if(result[0] === "ok") {
                        callback(null);
                        securitySystemCurrentStateCharacteristic.updateValue(value);
                    } else {
                        callback(new Error(result[0]));
                    }
                }).catch(function(err) {
                    that.log.error("[MiGatewayFM][ERROR]setFMStatus Error: " + err);
                    callback(err);
                });
            }.bind(this));
        services.push(service);

        return services;
    }
}

