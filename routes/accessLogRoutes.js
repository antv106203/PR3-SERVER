const express = require('express')
const accessLogController = require("../controller/accessLogController");
const verifyToken = require('../middlewares/authMiddleware');

const router = express.Router();

router.post("/accessLogs.json",verifyToken ,accessLogController.getAllAccessLogs);
router.get("/detail.json/:logId",verifyToken , accessLogController.getAccessLog);
router.post("/create.json/", verifyToken ,accessLogController.createAccessLog);
router.post("/receive", verifyToken ,accessLogController.receive);

module.exports = router;