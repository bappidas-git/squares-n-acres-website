/**
 * Landmarks near each locality, for `property.nearbyPlaces` (§6.1).
 *
 * These are **real** places: a "nearby" section that lists "International
 * school, 1.8 km" tells a buyer nothing, and the whole point of the section is
 * to let somebody recognise where a listing actually sits. The distances are
 * approximate straight-line-ish figures and the travel times are off-peak, in
 * the same spirit as everything else the seed publishes as indicative.
 *
 * Each entry is `[name, category (NEARBY_CATEGORIES), distanceKm, travelTimeMin]`.
 */

const NEARBY = {
  whitefield: [
    ['Hope Farm Metro Station', 'metro', 1.5, 6],
    ['Forum Shantiniketan Mall', 'mall', 2.6, 10],
    ['Vydehi Institute of Medical Sciences', 'hospital', 3.4, 13],
    ['Deens Academy', 'school', 2.2, 9],
    ['International Tech Park Bangalore', 'it-park', 4.2, 16],
    ['Whitefield Railway Station', 'railway', 3.0, 12],
    ['Kempegowda International Airport', 'airport', 45, 75],
  ],
  'sarjapur-road': [
    ['RGA Tech Park', 'it-park', 2.4, 9],
    ['Columbia Asia Hospital, Sarjapur Road', 'hospital', 3.2, 12],
    ['Greenwood High International School', 'school', 4.5, 15],
    ['Carmelaram Railway Station', 'railway', 3.8, 14],
    ['Agara Lake', 'park', 6.0, 20],
    ['Kempegowda International Airport', 'airport', 55, 90],
  ],
  'electronic-city': [
    ['Electronics City Metro Station', 'metro', 1.8, 7],
    ['Velankani Tech Park', 'it-park', 2.0, 8],
    ['Narayana Health City', 'hospital', 6.5, 18],
    ['Treamis World School', 'school', 3.0, 11],
    ['Heelalige Railway Station', 'railway', 5.5, 16],
    ['Kempegowda International Airport', 'airport', 55, 95],
  ],
  hebbal: [
    ['Hebbal Lake', 'park', 1.0, 4],
    ['Manyata Tech Park', 'it-park', 4.0, 14],
    ['Baptist Hospital', 'hospital', 2.5, 10],
    ['Esteem Mall', 'mall', 2.0, 8],
    ['Vidyashilp Academy', 'school', 6.0, 18],
    ['Kempegowda International Airport', 'airport', 27, 40],
  ],
  yelahanka: [
    ['Yelahanka Junction Railway Station', 'railway', 2.0, 8],
    ['Canadian International School', 'school', 4.0, 13],
    ['Elements Mall', 'mall', 6.5, 20],
    ['Columbia Asia Hospital, Hebbal', 'hospital', 8.0, 22],
    ['Yelahanka Lake', 'park', 1.5, 6],
    ['Kempegowda International Airport', 'airport', 18, 28],
  ],
  devanahalli: [
    ['Kempegowda International Airport', 'airport', 8, 15],
    ['KIADB Aerospace Park', 'it-park', 6.0, 14],
    ['Devanahalli Railway Station', 'railway', 3.0, 10],
    ['Akash Hospital, Devanahalli', 'hospital', 3.2, 11],
    ['Stonehill International School', 'school', 12.0, 25],
    ['Nandi Hills', 'other', 25.0, 45],
  ],
  koramangala: [
    ['Forum Mall, Koramangala', 'mall', 1.0, 5],
    ["St. John's Medical College Hospital", 'hospital', 1.5, 7],
    ['Bethany High School', 'school', 1.8, 8],
    ['Embassy Golf Links Business Park', 'it-park', 3.0, 12],
    ['Agara Lake', 'park', 3.5, 13],
    ['Kempegowda International Airport', 'airport', 40, 70],
  ],
  indiranagar: [
    ['Indiranagar Metro Station', 'metro', 0.8, 4],
    ['Manipal Hospital, Old Airport Road', 'hospital', 2.5, 10],
    ['New Horizon Public School', 'school', 2.0, 8],
    ['1 MG Mall', 'mall', 4.5, 15],
    ['Cubbon Park', 'park', 6.0, 18],
    ['Kempegowda International Airport', 'airport', 35, 60],
  ],
  'hsr-layout': [
    ['Central Silk Board Metro Station', 'metro', 3.5, 13],
    ['Narayana Multispeciality Hospital, HSR Layout', 'hospital', 1.5, 6],
    ['VIBGYOR High, HSR Layout', 'school', 1.2, 5],
    ['Agara Lake', 'park', 2.0, 8],
    ['Forum Mall, Koramangala', 'mall', 4.5, 16],
    ['Kempegowda International Airport', 'airport', 45, 75],
  ],
  'jp-nagar': [
    ['Jayaprakash Nagar Metro Station', 'metro', 1.2, 5],
    ['Royal Meenakshi Mall', 'mall', 3.0, 11],
    ['Apollo Hospital, Bannerghatta Road', 'hospital', 4.0, 14],
    ['Puttenahalli Lake', 'park', 2.5, 9],
    ['Delhi Public School South', 'school', 5.0, 16],
    ['Kempegowda International Airport', 'airport', 45, 75],
  ],
  'bannerghatta-road': [
    ['Jayadeva Institute of Cardiovascular Sciences', 'hospital', 2.0, 9],
    ['Royal Meenakshi Mall', 'mall', 1.5, 7],
    ['Ryan International School, Bannerghatta Road', 'school', 2.2, 9],
    ['Bannerghatta National Park', 'park', 10.0, 25],
    ['Bengaluru City Junction Railway Station', 'railway', 14.0, 35],
    ['Kempegowda International Airport', 'airport', 50, 80],
  ],
  'kanakapura-road': [
    ['Thalaghattapura Metro Station', 'metro', 1.5, 6],
    ['Turahalli Forest', 'park', 3.0, 11],
    ["Sri Kumaran Children's Home, Mallasandra", 'school', 2.5, 9],
    ['Apollo Hospital, Jayanagar', 'hospital', 8.0, 22],
    ['Vega City Mall', 'mall', 7.0, 20],
    ['Kempegowda International Airport', 'airport', 50, 85],
  ],
  marathahalli: [
    ['Soul Space Arena Mall', 'mall', 1.5, 7],
    ['Sakra World Hospital', 'hospital', 4.0, 14],
    ['New Horizon Gurukul', 'school', 2.0, 8],
    ['Embassy Tech Village', 'it-park', 5.0, 17],
    ['Krishnarajapuram Railway Station', 'railway', 8.0, 22],
    ['Kempegowda International Airport', 'airport', 40, 65],
  ],
  bellandur: [
    ['Embassy Tech Village', 'it-park', 1.2, 5],
    ['Central Mall, Bellandur', 'mall', 1.0, 5],
    ['Sakra World Hospital', 'hospital', 2.0, 8],
    ['Bellandur Lake', 'park', 1.0, 4],
    ['Carmelaram Railway Station', 'railway', 5.0, 16],
    ['Kempegowda International Airport', 'airport', 45, 75],
  ],
  hennur: [
    ['Elements Mall', 'mall', 4.0, 14],
    ['Manyata Tech Park', 'it-park', 6.0, 18],
    ['Legacy School', 'school', 2.5, 10],
    ['Columbia Asia Hospital, Hebbal', 'hospital', 6.5, 19],
    ['Hennur Bamboo Forest', 'park', 3.0, 11],
    ['Kempegowda International Airport', 'airport', 26, 42],
  ],
  thanisandra: [
    ['Elements Mall', 'mall', 1.5, 6],
    ['Manyata Tech Park', 'it-park', 3.5, 12],
    ['Aster CMI Hospital', 'hospital', 5.0, 16],
    ['Nagawara Lake', 'park', 4.0, 13],
    ['Canadian International School', 'school', 8.0, 21],
    ['Kempegowda International Airport', 'airport', 28, 45],
  ],
  jayanagar: [
    ['Jayanagar Metro Station', 'metro', 1.0, 5],
    ['Jayanagar 4th Block Shopping Complex', 'mall', 1.2, 6],
    ['Apollo Hospital, Jayanagar', 'hospital', 2.0, 8],
    ['National College, Jayanagar', 'school', 1.8, 8],
    ['Lalbagh Botanical Garden', 'park', 4.0, 14],
    ['Kempegowda International Airport', 'airport', 42, 70],
  ],
  rajajinagar: [
    ['Rajajinagar Metro Station', 'metro', 0.8, 4],
    ['Orion Mall', 'mall', 2.5, 10],
    ['ESI Hospital, Rajajinagar', 'hospital', 1.5, 7],
    ['National Public School, Rajajinagar', 'school', 1.8, 8],
    ['Bengaluru City Junction Railway Station', 'railway', 4.5, 15],
    ['Kempegowda International Airport', 'airport', 33, 55],
  ],
  malleshwaram: [
    ['Sampige Road Metro Station', 'metro', 0.7, 3],
    ['Mantri Square Mall', 'mall', 1.0, 5],
    ['Ramaiah Memorial Hospital', 'hospital', 2.5, 10],
    ['Cluny Convent High School', 'school', 1.2, 6],
    ['Sankey Tank', 'park', 1.5, 7],
    ['Kempegowda International Airport', 'airport', 31, 50],
  ],
  'kr-puram': [
    ['Krishnarajapura Metro Station', 'metro', 1.0, 5],
    ['Krishnarajapuram Railway Station', 'railway', 1.2, 6],
    ['Phoenix Marketcity', 'mall', 4.5, 15],
    ['Bagmane Tech Park', 'it-park', 6.0, 20],
    ['Vydehi Institute of Medical Sciences', 'hospital', 7.0, 22],
    ['Kempegowda International Airport', 'airport', 32, 55],
  ],
};

module.exports = { NEARBY };
