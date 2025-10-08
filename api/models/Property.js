module.exports = {
  primaryKey: 'id',
  attributes: {
    id: { type: 'string', columnName: '_id' },

    // Common
    owner: { model: 'user', required: true },
    propertyType: { type: 'string', isIn: ['residential', 'commercial'], required: true },
    subType: { type: 'string', allowNull: true },
    address: { type: 'string', required: true },
    city: { type: 'string', required: true },
    state: { type: 'string', required: true },
    pincode: { type: 'number', required: true },
    status: { type: 'string', isIn: ['pending', 'approved', 'rejected'], defaultsTo: 'pending' },

    // 🏠 Residential
    houseNo: { type: 'string', allowNull: true },
    apartmentName: { type: 'string', allowNull: true },
    area: { type: 'string', allowNull: true },
    landmark: { type: 'string', allowNull: true },
    bedrooms: { type: 'number', allowNull: true },
    bathrooms: { type: 'number', allowNull: true },
    balconies: { type: 'number', allowNull: true },
    livingRooms: { type: 'number', allowNull: true },
    otherRooms: { type: 'json', columnType: 'array', defaultsTo: [] },
    carpetArea: { type: 'number', allowNull: true },
    builtUpArea: { type: 'number', allowNull: true },
    clearHeight: { type: 'number', allowNull: true },
    furnishing: { type: 'string', allowNull: true },
    specifications: { type: 'string', allowNull: true },
    totalFloors: { type: 'number', allowNull: true },
    propertyOnFloor: { type: 'number', allowNull: true },
    ageOfProperty: { type: 'string', allowNull: true },
    availableFrom: { type: 'string', allowNull: true },
    expectedRent: { type: 'number', allowNull: true },
    maintenance: { type: 'number', allowNull: true },
    priceNegotiation: { type: 'boolean', defaultsTo: false },
    bookingAmount: { type: 'number', allowNull: true },
    membershipCharge: { type: 'number', allowNull: true },
    description: { type: 'string', allowNull: true },
    securityDeposit: { type: 'string', allowNull: true },
    durationOfAgreement: { type: 'string', allowNull: true },
    noticePeriod: { type: 'string', allowNull: true },
    coveredParking: { type: 'number', allowNull: true },
    openParking: { type: 'number', allowNull: true },
    facing: { type: 'string', allowNull: true },
    facingDetails: { type: 'string', allowNull: true },

    // 🏢 Commercial
    areaFromGoogle: { type: 'string', allowNull: true },
    officeNo: { type: 'string', allowNull: true },
    buildingName: { type: 'string', allowNull: true },
    zone: { type: 'string', allowNull: true },
    locationInside: { type: 'string', allowNull: true },
    superBuiltUpArea: { type: 'number', allowNull: true },
    entranceWidth: { type: 'number', allowNull: true },
    flooring: { type: 'string', allowNull: true },
    noOfCabins: { type: 'number', allowNull: true },
    maxSeats: { type: 'number', allowNull: true },
    meetingRooms: { type: 'number', allowNull: true },
    conferenceRooms: { type: 'number', allowNull: true },
    privateWashrooms: { type: 'number', allowNull: true },
    sharedWashrooms: { type: 'number', allowNull: true },
    receptionArea: { type: 'boolean', allowNull: true },
    pantryType: { type: 'string', allowNull: true },
    facilities: { type: 'json', columnType: 'array', defaultsTo: [] },
    fireSafetyMeasures: { type: 'json', columnType: 'array', defaultsTo: [] },

    yourFloorNo: { type: 'number', allowNull: true },
    staircases: { type: 'number', allowNull: true },
    parking: { type: 'string', allowNull: true },
    lockInPeriod: { type: 'string', allowNull: true },
    yearlyRentIncrease: { type: 'string', allowNull: true },
    amenities: { type: 'json', columnType: 'array', defaultsTo: [] },


    // Media
    images: { type: 'json', columnType: 'array', defaultsTo: [] },
    video: { type: 'string', allowNull: true },

    createdAt: { type: 'ref', columnType: 'datetime', autoCreatedAt: true },
    updatedAt: { type: 'ref', columnType: 'datetime', autoUpdatedAt: true },
  },

  customToJSON: function () {
    const formatted = this;
    if (this.createdAt) {
      const d = new Date(this.createdAt);
      formatted.createdAt = `${d.getDate().toString().padStart(2, '0')}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getFullYear()}`;
    }
    if (this.updatedAt) {
      const d = new Date(this.updatedAt);
      formatted.updatedAt = `${d.getDate().toString().padStart(2, '0')}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getFullYear()}`;
    }
    return formatted;
  }
};

