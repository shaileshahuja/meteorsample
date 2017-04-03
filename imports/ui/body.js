import {Meteor} from 'meteor/meteor';
import {Template} from 'meteor/templating';
import {ReactiveDict} from 'meteor/reactive-dict';
import './body.html';

Template.body.onCreated(function bodyOnCreated() {
    this.state = new ReactiveDict();
});

const getCheckedBoxes = function (checkboxes) {
    let checkboxesChecked = [];
    for (let i = 0; i < checkboxes.length; i++) {
        if (checkboxes[i].checked) {
            checkboxesChecked.push(checkboxes[i]["value"]);
        }
    }
    return checkboxesChecked.length > 0 ? checkboxesChecked : null;
};

let matches = [];

Template.body.helpers({
    matches() {
        const instance = Template.instance();
        return instance.state.get('matches');
    },
});

Template.body.events({
    'submit .new-request'(event, instance) {
        // Prevent default browser form submit
        event.preventDefault();

        // Get value from form element
        const target = event.target;
        const fromDate = target.from_date.value;
        const toDate = target.to_date.value;
        const startTime = target.start_time.value;
        const endTime = target.end_time.value;
        const repeatDays = getCheckedBoxes(target.repeat_days);

        // Insert a task into the collection
        Meteor.call('carepros.search', fromDate, toDate, startTime, endTime, repeatDays, function (error, result) {
            instance.state.set('matches', result);
        });
    }
});