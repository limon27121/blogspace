import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    firstname: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: "firstname cannot be empty" },
      },
    },
    // optional. a caller may register with a first name only, so this column
    // stays nullable and carries no notEmpty check
    lastname: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: { msg: "email must be a valid email address" },
      },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    // the uploaded file's public path, e.g. "/uploads/17-1712345678.png".
    // nullable: an account with no picture is the normal case, and every
    // reader falls back to initials
    image: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
    },
    // the sha-256 of the token that was emailed, never the token itself. A
    // stolen database dump then cannot be used to reset anyone's password, the
    // same reason the password column holds a hash
    resetTokenHash: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
    },
    // a reset link that never expires is a permanent second password
    resetTokenExpiry: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    role: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "user",
    },
  },
  {
    tableName: "users",
    timestamps: true,
    createdAt: "createAt",
    updatedAt: "updateAt",
    // the hash must never reach a response, so it is excluded by default and
    // only pulled in where the code explicitly asks for it (login)
    defaultScope: {
      attributes: { exclude: ["password", "resetTokenHash", "resetTokenExpiry"] },
    },
    scopes: {
      withPassword: { attributes: { include: ["password"] } },
      // only the reset flow opts into these
      withResetToken: { attributes: { include: ["resetTokenHash", "resetTokenExpiry"] } },
    },
  }
);

export default User;
