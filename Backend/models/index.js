// one place that wires the associations, so importing a single model can never
// leave the relation half-registered
import sequelize from "../config/db.js";
import User from "./user.model.js";
import Blog from "./blog.model.js";

// blogs.userId references users.id
User.hasMany(Blog, { foreignKey: "userId", as: "blogs", onDelete: "CASCADE" });
Blog.belongsTo(User, { foreignKey: "userId", as: "author" });

export { sequelize, User, Blog };
