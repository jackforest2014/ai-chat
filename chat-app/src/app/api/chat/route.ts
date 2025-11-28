import { NextRequest, NextResponse } from 'next/server'

// Mock AI responses for demonstration
const mockResponses = [
  "That's an interesting question! Let me help you with that.",
  "I understand what you're asking. Here's what I think...",
  "Great question! Based on my knowledge, I would say...",
  "I'd be happy to help you with that. Let me explain...",
  "That's a thoughtful question. Here's my perspective...",
  "I can definitely assist you with that. Consider this...",
  "Excellent point! Let me elaborate on that for you.",
  "I appreciate your question. Here's what you should know...",
]

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId, message } = body

    if (!sessionId || !message) {
      return NextResponse.json(
        { error: 'Missing sessionId or message' },
        { status: 400 }
      )
    }

    // Simulate AI processing delay
    await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 1000))

    // Generate a mock response
    const randomResponse =
      mockResponses[Math.floor(Math.random() * mockResponses.length)]

    // Create a contextual response based on the user's message
    let aiResponse = randomResponse

    if (message.toLowerCase().includes('hello') || message.toLowerCase().includes('hi')) {
      aiResponse = "Hello! It's great to chat with you. What can I help you with today?"
    } else if (message.toLowerCase().includes('help')) {
      aiResponse = "I'm here to help! You can ask me anything, and I'll do my best to provide useful information and insights."
    } else if (message.toLowerCase().includes('how are you')) {
      aiResponse = "I'm functioning perfectly, thank you for asking! How can I assist you today?"
    } else if (message.toLowerCase().includes('bye') || message.toLowerCase().includes('goodbye')) {
      aiResponse = "Goodbye! It was nice chatting with you. Feel free to come back anytime!"
    } else {
      aiResponse += ` Regarding "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}", I think it's worth considering multiple perspectives on this topic.`
    }

    return NextResponse.json({
      message: aiResponse,
      sessionId,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('API Error:', error)

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid request format' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
