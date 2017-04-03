import { Meteor } from 'meteor/meteor';
import { Random } from 'meteor/random';
import { CarePros, Customers } from './carepros.js';
import { assert } from 'meteor/practicalmeteor:chai';

if (Meteor.isServer) {
    describe('Tasks', () => {
        describe('methods', () => {
            beforeEach(() => {
                CarePros.remove({});
                JSON.parse(Assets.getText("carepros.json")).care_pros.forEach(function (doc) {
                    CarePros.insert(doc);
                });
                Customers.remove({});
                JSON.parse(Assets.getText("users.json")).users.forEach(function (doc) {
                    Customers.insert(doc);
                });
            });

            it('can filter and score properly', () => {
                // Find the internal implementation of the task method so we can
                // test it in isolation
                const searchTask = Meteor.server.method_handlers['carepros.search'];

                // Set up a fake method invocation that looks like what the method expects
                const invocation = { };
                // Run the method with `this` set to the fake invocation
                const res = searchTask.apply(invocation, ["2017-06-06", "2017-06-20", "13:00", "14:00", ["Monday"]]);
                // Verify that the method does what we expected
                assert.equal(res.length, 3);
                assert.equal(res[0].score, 24.4);
                assert.equal(res[1].score, 21.5);
                assert.equal(res[2].score, 13.5);
            });
        });
    });
}