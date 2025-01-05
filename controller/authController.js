const authService = require('../service/authService');

async function loginHandler(req, res) {
  try {
    const { username, password } = req.body;
    const result = await authService.login(username, password);
    res.status(200).json(result);
  } catch (error) {

    // Check for specific error messages and return appropriate status codes
    if (error.message === 'Account not found') {
      return res.status(404).json({ message: error.message });
    } else if (error.message === 'Incorrect password') {
      return res.status(402).json({ message: error.message });
    } else if (error.message === 'Username and password cannot be empty') {
      return res.status(400).json({ message: error.message });
    }else {
      return res.status(500).json({ message: 'Internal server error' });
    }
  }
}

const register = async (req, res) => {
    try {
      const { username, password } = req.body;
  
      // Gọi service để đăng ký người dùng
      const result = await authService.register(username, password);
  
      // Trả về thông báo thành công
      res.status(201).json(result);
    } catch (error) {
      console.error(error.message);
      res.status(400).json({ message: error.message });
    }
};

module.exports = { loginHandler, register };