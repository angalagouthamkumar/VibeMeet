const meetingSchema = new Schema({
    user_id: {
        type: String,
        required: true
    },
    meetingCode: {
        type: String,
        required: true
    },
    date : {
        type: Date,
        required: true,
        default: Date.now
    }
    
})

const meeting = mongoose.model("meeting", meetingSchema);
export { meeting };