const express = require('express')
const userController = require("../controller/userController")

const router = express.Router();

router.post("/createUser.json", userController.createUser);
router.get("/detail.json/:userId", userController.getUserByUserId);
router.put("/update.json/:userId", userController.updateUser);
router.put("/delete.json/:userId", userController.deleteUser);
router.post("/users.json", userController.getAllUsers);

module.exports = router;