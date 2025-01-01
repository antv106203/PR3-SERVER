const mqtt = require('mqtt');

// Thông tin HiveMQ Cloud
const host = 'e6156bdef5464a0d89c964ec95bdc7a8.s1.eu.hivemq.cloud';
const port = 8883; // TLS MQTT Port
const options = {
    port: port,
    host: host,
    protocol: 'mqtts', // Sử dụng 'mqtts' cho kết nối TLS
    username: 'an106203', // Thay bằng tên người dùng của bạn
    password: 'An106203dh123@'  // Thay bằng mật khẩu của bạn
};

// Kết nối đến broker
const client = mqtt.connect(options);

client.on('connect', () => {
    client.subscribe('#', (err) => {
        if(!err) console.log("connected mqtt");
        else console.log("error")
    });
});

module.exports = client;
