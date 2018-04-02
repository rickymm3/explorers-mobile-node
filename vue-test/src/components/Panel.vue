<template>
    <div class="panel">
        <div class="panel-title">{{title}}</div>
        <slot></slot>
    </div>
</template>

<style lang="scss">
    @import '~scss/styles';

    $bgColor: #94afbe;

    .panel {
        @include round(10px);
        @include dark-shadow();
        padding: 15px 5px 5px 5px;
        background: $bgColor;
        margin-top: 10px;
        margin-right: 10px;
    }

    .panel-title {
        @include round(10px);
        position: absolute;
        top: -15px;
        left: 0px;
        padding: 5px 10px;
        background: $bgColor;
    }
</style>

<script>
    export default {
    	props: ['title'],
    	data() {
    		return {
    			//title: 'test'
            }
        }
    }
</script>