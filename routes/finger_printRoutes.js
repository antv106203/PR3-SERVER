const express = require('express')
const finger_printController = require("../controller/finger_printController");
const verifyToken = require('../middlewares/authMiddleware');
const router = express.Router();

router.post("/create.json", verifyToken ,finger_printController.createFingerprint);
router.post("/delete.json", verifyToken ,finger_printController.deleteFingerprint);
router.post("/quetvantay", verifyToken ,finger_printController.quetvantay);
router.post("/huythem", verifyToken ,finger_printController.huythem);
router.post("/enableFingerPrint", verifyToken ,finger_printController.enableFingerPrint);
router.post("/disableFingerPrint",verifyToken , finger_printController.disableFingerPrint);

module.exports = router;