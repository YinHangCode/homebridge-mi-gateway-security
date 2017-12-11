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

Date.prototype.Format = function(fmt) {
    var o = {
        "M+": this.getMonth() + 1, //月份 
        "d+": this.getDate(), //日 
        "h+": this.getHours(), //小时 
        "m+": this.getMinutes(), //分 
        "s+": this.getSeconds(), //秒 
        "q+": Math.floor((this.getMonth() + 3) / 3), //季度 
        "S": this.getMilliseconds() //毫秒 
    };
    if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
    for (var k in o)
    if (new RegExp("(" + k + ")").test(fmt)) fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
    return fmt;
}

function MiGatewaySecurity(log, config) {
    if(null == config) {
        return;
    }

    this.log = log;
    this.config = config;
    if(config.nightTime) {
        try {
            var nightTimeArr = config.nightTime.split("-");
            this.nightTimeStart = new Date("2017-11-28 " + nightTimeArr[0]).Format("hhmmss");
            this.nightTimeEnd = new Date("2017-11-28 " + nightTimeArr[1]).Format("hhmmss");
            this.log.info("[MiGatewaySecurity][INFO]nightTime: " + nightTimeArr[0] + " - " + nightTimeArr[1]);
        } catch(err) {
            this.nightTimeStart = null;
            this.nightTimeEnd = null;
            this.log.error("[MiGatewaySecurity][ERROR]get nightTime Error: " + err);
        }
    }
    
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

        var infoService = new Service.AccessoryInformation();
        infoService
            .setCharacteristic(Characteristic.Manufacturer, "XiaoMi")
            .setCharacteristic(Characteristic.Model, "Gateway")
            .setCharacteristic(Characteristic.SerialNumber, "Undefined");
        services.push(infoService);

        var service = new Service.SecuritySystem(this.config['name']);
        var securitySystemCurrentStateCharacteristic = service.getCharacteristic(Characteristic.SecuritySystemCurrentState);
        var securitySystemTargetStateCharacteristic = service.getCharacteristic(Characteristic.SecuritySystemTargetState);
        
        // default value is disarm
        securitySystemTargetStateCharacteristic.value = Characteristic.SecuritySystemTargetState.DISARM;
        securitySystemCurrentStateCharacteristic.value = Characteristic.SecuritySystemCurrentState.DISARMED;
        
        securitySystemCurrentStateCharacteristic
            .on('get', function(callback) {
                that.device.call("get_arming", []).then(result => {
                    var value = null;
                    if(result[0] === 'on') {
                        if(securitySystemCurrentStateCharacteristic.value != Characteristic.SecuritySystemCurrentState.AWAY_ARM && 
                            securitySystemCurrentStateCharacteristic.value != Characteristic.SecuritySystemCurrentState.NIGHT_ARM) {
                            if(that.isNight()) {
                                value = Characteristic.SecuritySystemCurrentState.NIGHT_ARM;
                            } else {
                                value = Characteristic.SecuritySystemCurrentState.AWAY_ARM;
                            }
                        } else {
                            value = securitySystemCurrentStateCharacteristic.value;
                        }
                    } else if(result[0] === 'off') {
                        if(securitySystemCurrentStateCharacteristic.value != Characteristic.SecuritySystemCurrentState.STAY_ARM && 
                            securitySystemCurrentStateCharacteristic.value != Characteristic.SecuritySystemCurrentState.DISARMED) {
                            value = Characteristic.SecuritySystemCurrentState.DISARMED;
                        } else {
                            value = securitySystemCurrentStateCharacteristic.value;
                        }
                    }
                    
                    if(null != value) {
                        callback(null, value);
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
                        if(securitySystemTargetStateCharacteristic.value != Characteristic.SecuritySystemTargetState.AWAY_ARM && 
                            securitySystemTargetStateCharacteristic.value != Characteristic.SecuritySystemTargetState.NIGHT_ARM) {
                            if(that.isNight()) {
                                value = Characteristic.SecuritySystemTargetState.NIGHT_ARM;
                            } else {
                                value = Characteristic.SecuritySystemTargetState.AWAY_ARM;
                            }
                        } else {
                            value = securitySystemTargetStateCharacteristic.value;
                        }
                    } else if(result[0] === 'off') {
                        if(securitySystemTargetStateCharacteristic.value != Characteristic.SecuritySystemTargetState.STAY_ARM && 
                            securitySystemTargetStateCharacteristic.value != Characteristic.SecuritySystemTargetState.DISARM) {
                            value = Characteristic.SecuritySystemTargetState.DISARM;
                        } else {
                            value = securitySystemTargetStateCharacteristic.value;
                        }
                    }
                    
                    if(null != value) {
                        callback(null, value);
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
                if(Characteristic.SecuritySystemCurrentState.STAY_ARM == value) {
                    val = "off";
                } else if(Characteristic.SecuritySystemCurrentState.AWAY_ARM == value) {
                    val = "on";
                } else if(Characteristic.SecuritySystemCurrentState.NIGHT_ARM == value) {
                    val = "on";
                } else if(Characteristic.SecuritySystemCurrentState.DISARMED == value) {
                    val = "off";
                } else {
                    val = "off";
                }
                
                that.device.call("set_arming", [val]).then(result => {
                    if(result[0] === "ok") {
                        callback(null);
                        securitySystemCurrentStateCharacteristic.updateValue(value);
                    } else {
                        callback(new Error(result[0]));
                    }
                }).catch(function(err) {
                    that.log.error("[MiGatewaySecurity][ERROR]SecuritySystemTargetState Error: " + err);
                    callback(err);
                });
            }.bind(this));
        services.push(service);
        
        return services;
    },
    
    isNight: function() {
        if(!this.nightTimeStart) {
            return false;
        }
        
        if(!this.nightTimeEnd) {
            return false;
        }
        
        var nowTime = parseInt(new Date().Format("hhmmss"));
        var startTime = parseInt(this.nightTimeStart);
        var endTime = parseInt(this.nightTimeEnd);
        if(startTime > endTime) {
            if(nowTime >= startTime || nowTime <= endTime) {
                return true;
            } else {
                return false;
            }
        } else if(startTime < endTime) {
            if(nowTime >= startTime && nowTime <= endTime) {
                return true;
            } else {
                return false;
            }
        }
        
        return false;
    }
}

