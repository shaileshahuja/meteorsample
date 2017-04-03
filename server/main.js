import {Meteor} from 'meteor/meteor';
import {CarePros, Customers} from '../imports/api/carepros.js';

Meteor.startup(() => {
    // load dummy data
    if (CarePros.find().count() === 0) {
        JSON.parse(Assets.getText("carepros.json")).care_pros.forEach(function (doc) {
            CarePros.insert(doc);
        });
    }
    if (Customers.find().count() === 0) {
        JSON.parse(Assets.getText("users.json")).users.forEach(function (doc) {
            Customers.insert(doc);
        });
    }
});
