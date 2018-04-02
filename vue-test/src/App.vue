<script>
	import TestButton from './components/TestButton.vue'
	import Panel from './components/Panel.vue'

	const testCases = require('./lib/vue-test-cases');

	$('ready', function init() {
		$$$.resultsOutput = $('.results .output-text');
	});

	function pretty(json) {
		return JSON.stringify(json, null, '  ');
    }

	function sendAjax(urlObj, callbacks) {
		const request = _.merge(urlObj, callbacks, {
			contentType: "application/json; charset=utf-8",
			dataType   : "json",
			beforeSend(xhr) {
				if(_.isNullOrEmpty($$$.app.authCode)) return;

				const code = _.makeToken($$$.app.authCode, $$$.app.user.username, $$$.app.user.token);

				xhr.setRequestHeader('Authorization', code);
			}
		});

		$.ajax(request);
    }

	export default {
		name: 'app',
		components: {TestButton, Panel},
		data () {
			return {
				title: 'SF-DEV Console',
				authCode: 'sf-dev',
				user: {
					name: 'Pierre Chamberlain',
					username: 'chamberlainpi',
					email: 'chamberlainpi@gmail.com',
					password: 'pi3rr3',
                    token: ''
				},
			}
		},

		mounted() {
			$$$.app = this;
		},

		computed: {
			testCases() { return testCases(); }
		},

		methods: {
			doTest(test) {
				//traceClear && traceClear();

				const _this = this;
				const testResult = test();

				TweenMax.set($$$.resultsOutput, {alpha: 0});
				$$$.resultsOutput.html('');

				if(!testResult) {
					return traceError("???");
				}

				const urlObj = _.isString(testResult) ? {url: testResult} : testResult;
				if(_.isObject(urlObj.data)) {
					urlObj.data = JSON.stringify(urlObj.data);
				}

				sendAjax(urlObj, {
					success(result) {
						_this.onResult(result, urlObj.url);

						urlObj.ok && urlObj.ok(result);
					},
					error(err) { _this.onError(err, urlObj.url); }
				});
			},

			onResult(data, url) {
				showUrlAndMessage(url, 'green', pretty(data) );
			},

			onError(err, url) {
				trace("Error?");
				const jsonStr = err.responseJSON ? pretty(err.responseJSON) : err.responseText;
				const errMessage = `<i class='red'><b>${err.statusText}</b> - ${jsonStr}</i>`;

				showUrlAndMessage(url, 'red-lite', errMessage);
			}
		}
	}

	function showResult(msg) {
		TweenMax.to($$$.resultsOutput, 0.5, {alpha: 1});

		$$$.resultsOutput.append(msg + "<br/>");
	}

	function getShortURL(url) {
		return {
			url: url,
			shortURL: window.location.protocol + '//...' + url.substr(url.indexOf('/', 10))
		};
	}

	function showUrlAndMessage(url, css, msg) {
		msg = msg.toString();
		var urlObj = getShortURL(url);
		showResult(`<i class="${css}"><b>URL:</b> ${urlObj.shortURL}</i>`);
		showResult(msg.replace(url, urlObj.shortURL));
	}

</script>

<template>
  <div id="app">
    <div id="titlebar">
      <h3>{{title}}</h3>
    </div>

    <div id="content">
      <!-- <img src="./assets/logo.png"> -->
      <Panel title="Test Cases">
        <div v-for="(access, accessKey) in testCases">
          <center><h4 class="accessKey">- {{accessKey}} -</h4></center>
          <div v-for="(testURL, key) in access">
            <TestButton @click.native="doTest(testURL)" class="letter-spaced">{{key}}</TestButton>
          </div>
        </div>
      </Panel>

      <Panel title="User Input Form">
        <br/>
        <label>
          Authorization Code<br/>
          <input type="input" v-model="authCode">
        </label><br/>

        <label>
          ID<br/>
          <input type="input" v-model="user.id">
        </label><br/>

        <label>
          Name<br/>
          <input type="input" v-model="user.name">
        </label><br/>

        <label>
          Username<br/>
          <input type="input" v-model="user.username">
        </label><br/>

        <label>
          Email<br/>
          <input type="input" v-model="user.email">
        </label><br/>

        <label>
          Password<br/>
          <input type="input" v-model="user.password">
        </label><br/>

        <label>
          Token<br/>
          <input type="input" v-model="user.token" disabled="true">
        </label><br/>
      </Panel>

      <Panel title="Results" class="results">
        <div class="output">
          <div class="ghost-block"></div>
          <div class="output-text"></div>
        </div>
      </Panel>
    </div>
  </div>
</template>

<style lang="scss">

    @import '~scss/styles';
    @import url('https://fonts.googleapis.com/css?family=Ubuntu');

    $titleBarBGColor: #996bc9;
    $titleBarHeight: 50px;
    $contentBGColor: #c8aac2;

    #app {
        font-family: 'Ubuntu', sans-serif;
    }

    #titlebar {
        @include rect();

        height: $titleBarHeight;
        line-height: $titleBarHeight;
        padding: 4px 15px;
        text-shadow: 1px 1px 0px white-alpha(), 0px 0px 16px white-alpha();

        background: grad-5($titleBarBGColor);
    }

    #content {
        @include rect();
        top: $titleBarHeight;
        padding: 10px;
        vertical-align: top;

        .panel {
            vertical-align: top;
        }

        background: grad-3($contentBGColor, 0, 2, 10);
    }

    .panel {
      position: relative;
      display: inline-block;
    }

    .results {
        position: absolute;
        display: block;
        top: 10px;
        left: 460px;
        min-width: 200px;

        .output {
            position: relative;
            overflow: hidden;
            display: block;
            background: #222;
            color: #fff;
            padding: 5px;
            margin-top: 5px;
            border: solid 1px #fff;
            text-shadow: none;

            .ghost-block, .output-text {
                vertical-align: top;
                position: relative;
                display: inline-block;
            }
            .ghost-block {
                height: 50px;
                width: 1px;
            }

            .output-text {
              font-family: monospace;
              white-space: pre;
            }
        }
    }

    .accessKey {
        margin-top: 10px;
    }

  input[disabled] {
    background: #888;
    color: #fff;
  }
</style>