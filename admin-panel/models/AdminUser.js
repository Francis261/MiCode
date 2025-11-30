const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const AdminUserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    required: true,
    enum: ['superadmin', 'admin', 'editor', 'viewer'], // Define possible roles
    default: 'viewer',
  },
  permissions: {
    type: Map,
    of: String, // '*' for full, '+' for access, '-' for no access
    default: {
      dashboard: '+',
      manageAdmins: '-',
      products: '+',
      services: '+',
      testimonials: '+',
      support: '+',
      customOrders: '+',
      ordersPayments: '+',
      users: '+',
    },
  },
  isBlocked: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });

// Hash password before saving
AdminUserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Method to compare passwords
AdminUserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('AdminUser', AdminUserSchema);