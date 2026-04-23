exports.login = (req, res, next) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    // Accept dummy login
    res.json({ message: "Welcome to RoomSathi! Login successful." });
  } catch (error) {
    next(error);
  }
};

exports.signup = (req, res, next) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    // Accept dummy signup
    res.status(201).json({ message: "Account created successfully! Please login." });
  } catch (error) {
    next(error);
  }
};
