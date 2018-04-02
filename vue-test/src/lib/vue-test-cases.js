/**
 * Created by Chamberlain on 8/11/2017.
 */

module.exports = function() {
	const hostStr = window.location.toString();
	const host = hostStr.substr(0, hostStr.indexOf('/', 10));
	const api = host.replace(/:[0-9]+/, ':'+ENV.PORT) + '/api';

	//////////////////////////// TEST!!!!!!!!!!!!!!!!!!!!!!
	setTimeout(() => {
		//trace($$$.app.testCases);
		$$$.app.doTest($$$.app.testCases.USER.login);
	}, 250);
	//////////////////////////// TEST!!!!!!!!!!!!!!!!!!!!!!

	return {
		// PUBLIC: {
		// 	test() {
		// 		return api + '/test';
		// 	},
		// 	'test-banned'() {
		// 		return api + '/test-banned';
		// 	}
		// },
		TEST: {
			'not-found'() {
				return api + '/not-found';
			},
			'test-echo'() {
				return {
					url: api + '/test-echo',
					method: 'post',
					data: {
						test: {
							message: 'Hello World!'
						}
					}
				}
			},
		},

		USER: {
			// last() { return api + '/user/last'; },
			// by_id() { return api + '/user?id=' + $$$.app.user.id; },
			// by_username() { return api + '/user?username=' + $$$.app.user.username; },

			add() {
				const user = $$$.app.user;
				return {
					url: api + '/user/public/add',
					method: 'post',
					data: {
						name: user.name,
						email: user.email,
						username: user.username,
						password: user.password,
					}
				}
			},
			login() {
				const user = $$$.app.user;
				return {
					url: api + '/user/login',
					method: 'post',
					data: {
						name: user.name,
						email: user.email,
						username: user.username,
						password: user.password,
					},
					ok(response) {
						user.token = response.data.login.token;
					}
				};
			},
			logout() {
				const user = $$$.app.user;
				return {
					url: api + '/user/logout',
					method: 'post'
				};
			},
			test_echo() {
				const user = $$$.app.user;
				return {
					url: api + '/user/test-echo',
					method: 'post',
					data: {
						test: 'Hello World (secure)'
					}
				};
			},
			game_data() {
				return {
					url: api + '/user/game',
					method: 'get'
				};
			},

			// forget_password() {
			// 	const user = $$$.app.user;
			// 	return {
			// 		url: api + '/user/forget-password',
			// 		method: 'post',
			// 		data: {
			// 			name: user.name,
			// 			email: user.email,
			// 			username: user.username,
			// 			password: user.password,
			// 		}
			// 	};
			// },
		},

		CURRENCY: {
			add_gold() {
				const user = $$$.app.user;
				return {
					url: api + '/user/currency',
					method: 'put',
					data: { gold: 1 }
				};
			},
			add_gems() {
				const user = $$$.app.user;
				return {
					url: api + '/user/currency',
					method: 'put',
					data: { gems: 1 }
				};
			},
			add_scrolls() {
				const user = $$$.app.user;
				return {
					url: api + '/user/currency',
					method: 'put',
					data: { scrolls: 1 }
				};
			},
			add_magic_orbs() {
				const user = $$$.app.user;
				return {
					url: api + '/user/currency',
					method: 'put',
					data: { magicOrbs: 1 }
				};
			},
		},

		ITEMS: {
			list() {
				return {
					url: api + '/item/list',
					method: 'get',
					data: {}
				};
			}
		}
	};
}