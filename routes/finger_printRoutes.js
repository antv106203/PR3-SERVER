const express = require('express')
const finger_printController = require("../controller/finger_printController")
const router = express.Router();

router.post("/create.json", finger_printController.createFingerprint);
router.post("/delete.json", finger_printController.deleteFingerprint);
router.post("/quetvantay", finger_printController.quetvantay);
router.post("/huythem", finger_printController.huythem);

module.exports = router;