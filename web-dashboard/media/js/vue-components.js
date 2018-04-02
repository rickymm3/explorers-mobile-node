/**
 * Created by Chamberlain on 10/27/2017.
 */

function wrapInDivs(comp, className) {
	_.forEach(comp.$el.children, (child, i) => {
		$(child).wrap(`<div class="${className} index-${i}"></div>`);
	});
}

export default {
	'btn': {
		props: ['icon'],
		noDiv: true, //capture.stop.prevent
		template: `<div :class="'btn' + (icon ? ' ' + icon : '')" v-on:click="click">
					<i :class="'fa fa-'+icon" v-if="icon"></i> 
					<slot></slot>
					</div>`,
		methods: {
			click: function (e) { this.$emit('click', e); }
		},
	},

	'menubar': {
		mounted() {
			trace("Menubar mounted!");
		},
		template: `<slot></slot>`
	},

	'hbox': {
		mounted() {
			wrapInDivs(this, 'child hbox-child');
		},
		template: `<slot></slot>`
	},

	'vbox': {
		mounted() {
			wrapInDivs(this, 'child vbox-child');
		},
		template: `<slot></slot>`
	}
};