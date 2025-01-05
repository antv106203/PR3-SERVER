const express = require('express');
const bodyParser = require('body-parser');
//const dbConnect = require("./db/dbConnect");
const userRoutes = require("./routes/userRoutes")
const accessLogRoutes = require("./routes/accessLogRoutes");
const finger_printRoutes = require("./routes/finger_printRoutes")
const authRoutes = require("./routes/authroutes")
const client = require("./config/mqqtConnect");
const cors = require('cors'); // Import cors middleware
const { createAccessLog } = require('./service/access_logService');
const { startExpiredCheck } = require("./service/finger_printService");


// Cấu hình CORS
const corsOptions = {
    origin: 'http://localhost:4444', // Chỉ cho phép yêu cầu từ localhost:4444
    methods: 'GET,POST,PUT,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type,Authorization',
    credentials: true, // Cho phép cookie hoặc credentials khác
    preflightContinue: false,
    optionsSuccessStatus: 200
};

//const mqtt = require("mqtt");
// const host = 'e6156bdef5464a0d89c964ec95bdc7a8.s1.eu.hivemq.cloud';
// const port = 8883; // TLS MQTT Port
// const options = {
//     port: port,
//     host: host,
//     protocol: 'mqtts', // Sử dụng 'mqtts' cho kết nối TLS
//     username: 'an106203', // Thay bằng tên người dùng của bạn
//     password: 'An106203dh123@'  // Thay bằng mật khẩu của bạn
// };
// const client = mqtt.connect(options);
const topic = "fingerprint/data";
// client.on("connect", async() =>{
//     console.log("MQTT connected");
//     client.subscribe(topic);
// })

client.on("message", async (topic, message) => {
    console.log("MQTT received topic:", topic.toString());
    try {
        if(topic.toString() === "/fingerprint"){
        const jsonMessage = JSON.parse(message.toString());
        await createAccessLog(jsonMessage);
        }
    } catch (error) {
        console.log("Message (Raw):", message.toString());
        console.error("Error parsing message as JSON:", error);
    }
});
const app = express();
const PORT = 5000;
app.use(express.json()); // Parse application/json
app.use(express.urlencoded({ extended: true })); // Parse application/x-www-form-urlencoded
startExpiredCheck();
app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/user', userRoutes);
app.use('/access-log', accessLogRoutes)
app.use('/finger-print', finger_printRoutes)
app.use('/auth', authRoutes)


module.exports = app;