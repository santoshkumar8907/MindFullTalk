const WellnessPlan = require('../models/WellnessPlan');
const User = require('../models/User');
const { GoogleGenAI } = require('@google/genai');

exports.generatePlan = async (req, res) => {
  try {
    const { issue, language = 'en-US' } = req.body;
    const userId = req.user._id;

    if (!issue) {
      return res.status(400).json({ message: 'Please provide an issue to generate a plan for.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      return res.status(500).json({ message: 'AI service is currently unavailable.' });
    }

    const ai = new GoogleGenAI({ apiKey });
    const prompt = `You are an expert mental wellness and life coach. The user needs a personalized wellness plan for the following issue:
"${issue}"

Please provide a structured plan in ${language}.
IMPORTANT: If the user specifies a specific timeline or number of days in their issue (e.g., "7-day plan", "3 days"), dynamically adapt the 'dailyTasks' array to map to that timeline (e.g., ["Day 1: ...", "Day 2: ..."]). Otherwise, provide a general list of daily habits.

Return ONLY a valid JSON object in the exact following format, without markdown or backticks:
{
  "title": "A short, encouraging title for the plan",
  "dailyTasks": ["Task 1", "Task 2", "Task 3"],
  "recommendations": ["Recommendation 1", "Recommendation 2"],
  "mindsetShift": "A positive paradigm shift or affirmation"
}`;

    let parsedPlan;
    try {
      const result = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });
      const responseText = result.text;
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      const cleanJson = jsonMatch ? jsonMatch[0] : responseText;
      parsedPlan = JSON.parse(cleanJson);
    } catch (err) {
      console.error('Plan Generation Error:', err.message);
      // Graceful fallback
      parsedPlan = {
        title: "Your General Wellness Plan",
        dailyTasks: ["Take a 10-minute walk", "Practice deep breathing", "Write down one thing you are grateful for"],
        recommendations: ["Stay hydrated", "Ensure you get 7-8 hours of sleep", "Reach out to a supportive friend"],
        mindsetShift: "Every small step counts towards a healthier mind."
      };
    }

    const newPlan = new WellnessPlan({
      userId,
      issue,
      planData: parsedPlan
    });

    await newPlan.save();

    // Award Gamification Points (+20 for making a plan)
    const user = await User.findById(userId);
    if (user) {
      user.gamification.points += 20;
      await user.save();
    }

    res.status(201).json(newPlan);
  } catch (error) {
    console.error('generatePlan error:', error);
    res.status(500).json({ message: error.message });
  }
};

exports.getUserPlans = async (req, res) => {
  try {
    const plans = await WellnessPlan.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(20);
    res.json(plans);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getPlanById = async (req, res) => {
  try {
    const plan = await WellnessPlan.findOne({ _id: req.params.id, userId: req.user._id });
    if (!plan) return res.status(404).json({ message: 'Plan not found' });
    res.json(plan);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deletePlan = async (req, res) => {
  try {
    const plan = await WellnessPlan.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!plan) return res.status(404).json({ message: 'Plan not found' });
    res.json({ message: 'Plan deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
