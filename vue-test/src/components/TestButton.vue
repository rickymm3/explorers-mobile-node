<template>
    <button class="test-button">
        <slot></slot>
    </button>
</template>

<style lang="scss">
    @import '~scss/styles';

    .test-button {
        @include btn(5px);

        font-weight: bold;
        width: 200px;
        text-align: left;
        background: linear-gradient(#fff, #ddd, #aaa, #777);

        &:hover {
            color: #fff;
            text-shadow: 0px 0px 1px #000, 0px 0px 4px #000;
            background: linear-gradient(#ddf*1.2, #ddf*1.1, #ddf*1.0, #ddf*0.8);
        }
    }
</style>
