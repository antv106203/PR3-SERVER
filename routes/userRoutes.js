const express = require('express')
const userController = require("../controller/userController")
const verifyToken = require("../middlewares/authMiddleware")
const router = express.Router();

router.post("/createUser.json",verifyToken ,userController.createUser);
router.get("/detail.json/:userId",verifyToken , userController.getUserByUserId);
router.put("/update.json",verifyToken , userController.updateUser);
router.put("/delete.json/:userId",verifyToken , userController.deleteUser);
router.post("/users.json",verifyToken ,userController.getAllUsers);

module.exports = router;