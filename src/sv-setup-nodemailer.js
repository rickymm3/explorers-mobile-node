/**
 * Created by Chamberlain on 8/24/2017.
 */
const nodemailer = require('nodemailer');
const EMAIL = $$$.env.ini.EMAIL;
const defaultFrom = `${EMAIL.DEFAULT_FROM_NAME} <${EMAIL.DEFAULT_FROM_EMAIL}>`;
let transporter;

function setup() {
	return new Promise((resolve, reject) => {
		// create reusable transporter object using the default SMTP transport
		transporter = nodemailer.createTransport({
			host: EMAIL.HOST,
			port: EMAIL.PORT,
			secure: _.isTruthy(EMAIL.SECURE), // secure:true for port 465, secure:false for port 587
			auth: {
				user: EMAIL.USERNAME,
				pass: EMAIL.PASSWORD
			}
		});

		trace("NODEMAILER ".yellow + "initialized.");
		resolve();
	});
}

_.extend(setup, {
	sendEmail(to, subject, content, params) {
		if(!params) params = {};

		let mailOptions = _.extend({
			from: defaultFrom,
			to:to,
			subject:subject,
			html:content
		}, params);

		if(!_.isTruthy(EMAIL.ENABLED)) {
			return new Promise((_then, _catch) => {
				_then({isEmailDisabled:1, message:'The email service is disabled'});
			})
		}

		//info.messageId, info.response
		return transporter.sendMail(mailOptions);
	}
});

module.exports = setup;
