
let state = {};

module.exports = {
    getStateKey(key) {
        return state[key];
    },

    setStateKey(key, value) {
        state[key] = value;
    },

    getState() {
        return state;
    },

    clearState() {
        state = {};
    }
}