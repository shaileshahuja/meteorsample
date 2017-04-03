import {Meteor} from 'meteor/meteor';
import {Mongo} from 'meteor/mongo';
import {check} from 'meteor/check';

export const CarePros = new Mongo.Collection('carePros');
export const Customers = new Mongo.Collection('customers');

const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const parseDbTime = function(time_str) {
    const data = time_str.split(":");
    let hh = parseInt(data[0]);
    let mm = data[1];
    if(mm.substring(2) == "pm" && hh < 12) {
        hh += 12;
    }
    if(mm.substring(2) == "am" && hh == 12) {
        hh -= 12;
    }
    mm = parseInt(mm.substring(0, 2));
    return hh * 100 + mm;
};

const parseFormTime = function(time_str) {
    const data = time_str.split(":");
    let hh = parseInt(data[0]);
    let mm = parseInt(data[1]);
    return hh * 100 + mm;
};

const parseDbDate = function(date_str) {
    const from = date_str.split("-");
    return new Date(from[2], from[1] - 1, from[0]);
};

const getAge = function (birthDate) {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
};

const scoreMatch = function (user, carePro) {
    let score = parseFloat(carePro["personal_information"]["rating"]);

    if(user["gender"] === carePro["personal_information"]["gender"]) {
        score += 5;
    }

    const ageDiff = Math.abs(getAge(new Date(user["date_of_birth"])) - getAge(new Date(carePro["personal_information"]["date_of_birth"])));
    // age score from 0 to 5. The less the difference in age, the greater the score.
    score += Math.max(50 - ageDiff, 0) / 10.0;

    // add score of 5 for each common language
    for(let i = 0; i < carePro["personal_information"]["fluent_languages"].length; i++) {
        const language = carePro["personal_information"]["fluent_languages"][i];
        if(user["fluent_languages"].indexOf(language) >= 0) {
            score += 5;
        }
    }
    return score;
};

const isOnHoliday = function(carePro, fromDate, toDate, repeatDays) {
    if(carePro["daysoff"] === undefined)
        return false;
    for(let i = 0; i < carePro["daysoff"].length; i++) {
        const holidays = carePro["daysoff"][i];

        // this will not be needed when the care pro data is entered via the web app and will be stored as Date in mongo
        holidays["start_date"] = parseDbDate(holidays["start_date"]);
        holidays["end_date"] = parseDbDate(holidays["end_date"]);

        if (holidays["start_date"] <= toDate && holidays["end_date"] >= fromDate) {
            // ensuring correct bounds
            const start_date = holidays["start_date"] < fromDate? fromDate: holidays["start_date"];
            const end_date = holidays["end_date"] > toDate? toDate: holidays["end_date"];

            // max 12 comparisons in this loop
            // to find out if the off days are not affecting the requested schedule
            // For example, if Monday, Friday is requested, and Care Pro is off from Tuesday to Thursday
            for (let d = start_date; d <= end_date; d.setDate(d.getDate() + 1)) {
                const day = days[d.getDay()];
                if(repeatDays.indexOf(day) >= 0) {
                    return true;
                }
            }
        }
    }
    return false;
};

const isFreeAtTime = function(carePro, startTime, endTime, repeatDays) {
    for(let i = 0; i < repeatDays.length; i++) {
        const day = repeatDays[i];
        if (carePro["availabilities"] === undefined || carePro["availabilities"][day] === undefined)
            return false;
        const availability = carePro["availabilities"][day];
        if (parseDbTime(availability["start_time"]) > startTime || parseDbTime(availability["end_time"]) < endTime) {
            return false;
        }
        if (carePro["breaks"] === undefined || carePro["breaks"][day] === undefined)
            continue;
        const dayBreak = carePro["breaks"][day];
        if (parseDbTime(dayBreak["start_time"]) < endTime && parseDbTime(dayBreak["end_time"]) > startTime) {
            return false;
        }
    }
    return true;
};

const isAvailable = function (carePro, fromDate, toDate, startTime, endTime, repeatDays) {
    // const fromDate = visitRequest["visit_schedule"]["date_from"];
    // const toDate = visitRequest["visit_schedule"]["date_to"];
    // const repeatDays = visitRequest["visit_schedule"]["repeat_days"];
    // const starttime = visitRequest["visit_schedule"]["start_time"];
    // const endtime = visitRequest["visit_schedule"]["end_time"];

    if(isOnHoliday(carePro, fromDate, toDate, repeatDays))
        return false;
    return isFreeAtTime(carePro, startTime, endTime, repeatDays);
};


Meteor.methods({
    'carepros.search'(fromDate, toDate, startTime, endTime, repeatDays) {
        check(startTime, String);
        check(endTime, String);
        check(repeatDays, [String]);
        check(fromDate, String);
        check(toDate, String);

        fromDate = new Date(fromDate);
        toDate = new Date(toDate);
        startTime = parseFormTime(startTime);
        endTime = parseFormTime(endTime);

        // TODO: research if an advanced mongodb filter for checking availability will be faster
        const carePros = CarePros.find({"status" : "Approved", "personal_information.city" : "Singapore"});
        let matches = [];

        const user = Customers.findOne(); // TODO: add login and change this to Meteor.user
        carePros.forEach(function (carePro) {
            if (isAvailable(carePro, fromDate, toDate, startTime, endTime, repeatDays)) {
                carePro["score"] = scoreMatch(user, carePro);
                matches.push(carePro);
            }
        });
        matches.sort(function (a, b) {
            return b["score"] - a["score"];
        });
        return matches;
    },
});