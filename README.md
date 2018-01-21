# homebridge-mi-gateway-security
[![npm version](https://badge.fury.io/js/homebridge-mi-gateway-security.svg)](https://badge.fury.io/js/homebridge-mi-gateway-security)

XiaoMi Gateway Security plugin for HomeBridge.   
   
Thanks for [nfarina](https://github.com/nfarina)(the author of [homebridge](https://github.com/nfarina/homebridge)), [OpenMiHome](https://github.com/OpenMiHome/mihome-binary-protocol), [aholstenson](https://github.com/aholstenson)(the author of [miio](https://github.com/aholstenson/miio)), all other developer and testers.   
   
**Note: If you find bugs, please submit them to [issues](https://github.com/YinHangCode/homebridge-mi-gateway-security/issues) or [QQ Group: 107927710](//shang.qq.com/wpa/qunwpa?idkey=8b9566598f40dd68412065ada24184ef72c6bddaa11525ca26c4e1536a8f2a3d).**   

![](https://raw.githubusercontent.com/YinHangCode/homebridge-mi-gateway-security/master/images/Gateway.jpg)
![](https://raw.githubusercontent.com/YinHangCode/homebridge-mi-gateway-security/master/images/mi-acpartner.jpg)
![](https://raw.githubusercontent.com/YinHangCode/homebridge-mi-gateway-security/master/images/aqara-acpartner.jpg)

## Installation
1. Install HomeBridge, please follow it's [README](https://github.com/nfarina/homebridge/blob/master/README.md).   
If you are using Raspberry Pi, please read [Running-HomeBridge-on-a-Raspberry-Pi](https://github.com/nfarina/homebridge/wiki/Running-HomeBridge-on-a-Raspberry-Pi).   
2. Make sure you can see HomeBridge in your iOS devices, if not, please go back to step 1.   
3. Install packages.   
```
npm install -g miio homebridge-mi-gateway-security
```
## Configuration   
```
"accessories": [{
    "accessory": "MiGatewaySecurity",
    "ip": "192.168.88.xx",
    "token": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "name": "Security",
    "disable": false,
    "switchName": "Security Switch",
    "switchDisable": true
}]
```
## Get token
### Get token by miio2.db
setup MiJia(MiHome) app in your android device or android virtual machine.   
open MiJia(MiHome) app and login your account.   
refresh device list and make sure device display in the device list.   
get miio2.db(path: /data/data/com.xiaomi.smarthome/databases/miio2.db) file from your android device or android virtual machine.   
open website [[Get MiIo Tokens By DataBase File](http://miio2.yinhh.com/)], upload miio2.db file and submit.    
### Get token by network
Open command prompt or terminal. Run following command:
```
miio --discover
```
Wait until you get output similar to this:
```
Device ID: xxxxxxxx   
Model info: Unknown   
Address: 192.168.88.xx   
Token: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx via auto-token   
Support: Unknown   
```
"xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" is token.   
If token is "???", then reset device and connect device created Wi-Fi hotspot.   
Run following command:   
```
miio --discover --sync
```
Wait until you get output.   
For more information about token, please refer to [OpenMiHome](https://github.com/OpenMiHome/mihome-binary-protocol) and [miio](https://github.com/aholstenson/miio).   

## Version Logs
### 0.1.0 (2018-01-21)
1.add switch control security state.   
2.remove the superfluous security state.   
### 0.0.5 (2017-12-11)
1.set default state is off.   
### 0.0.4 (2017-10-31)
1.add setting nightTime feature.   
### 0.0.3 (2017-10-29)
1.fixed bug that keep loading.   
### 0.0.2 (2017-10-28)
1.change rule: Home is close.   
### 0.0.1 (2017-10-27)
1.support for gateway.   
2.support for mi ac partner.   
3.support for aqara ac partner.   
