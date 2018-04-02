/**
 * Created by Chamberlain on 10/27/2017.
 */

function setupSocketIO() {
	trace("SOCKET.IO: ".yellow + "Init.");

	$$$.io = require('socket.io')($$$.server);
}

module.exports = setupSocketIO;

