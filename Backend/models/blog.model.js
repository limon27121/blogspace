import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Blog = sequelize.define(
  "Blog",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "users", key: "id" },
    },
    blogTitle: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: "blogTitle cannot be empty" },
      },
    },
    blog: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: { msg: "blog content cannot be empty" },
      },
    },
    category: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: "category cannot be empty" },
      },
    },
  },
  {
    tableName: "blogs",
    timestamps: true,
    createdAt: "createAt",
    updatedAt: "updateAt",
  }
);

export default Blog;
