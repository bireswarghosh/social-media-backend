const nodeMailer = require("nodemailer");

exports.sendEmail = async (options) => {
  const transporter = nodeMailer.createTransport({
    host: "smtp.mailtrap.io",
    port: 2525,
    auth: {
      user: "211d4679e3d79c",
      pass: "9e2b7d43009e26",
    },
  });

  const mailOptions = {
    from: process.env.SMPT_MAIL, // SEND  mail --> developer
    to: options.email, // who send mail --> received this to option from req.body   //* tis option is backend\controllers\user.js\411-413
    subject: options.subject,
    text: options.message,
  };

  await transporter.sendMail(mailOptions);
};
