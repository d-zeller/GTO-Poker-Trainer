"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Shuffle, RotateCcw, TrendingUp } from "lucide-react"

// Types
type Suit = "♠" | "♥" | "♦" | "♣"
type Rank = "A" | "K" | "Q" | "J" | "T" | "9" | "8" | "7" | "6" | "5" | "4" | "3" | "2"
type Position = "SB" | "BB" | "MP" | "HJ" | "CO" | "BTN"
type Action = "fold" | "call" | "raise"

interface PlayingCard {
  rank: Rank
  suit: Suit
}

interface Hand {
  cards: [PlayingCard, PlayingCard]
  handString: string
}

interface PositionInfo {
  name: string
  fullName: string
  description: string
}

interface GTOAction {
  action: Action
  frequency: number
  reasoning: string
}

// Constants
const SUITS: Suit[] = ["♠", "♥", "♦", "♣"]
const RANKS: Rank[] = ["A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2"]

const POSITIONS: Record<Position, PositionInfo> = {
  BTN: { name: "BTN", fullName: "Button", description: "Best position - acts last postflop" },
  CO: { name: "CO", fullName: "Cutoff", description: "Second best position" },
  HJ: { name: "HJ", fullName: "Hijack", description: "Middle-late position" },
  MP: { name: "MP", fullName: "Middle Position", description: "Early-middle position" },
  BB: { name: "BB", fullName: "Big Blind", description: "Forced bet - acts last preflop" },
  SB: { name: "SB", fullName: "Small Blind", description: "Worst position - acts first postflop" },
}

// GTO Ranges (simplified for demo)
const GTO_RANGES: Record<Position, Record<string, GTOAction>> = {
  BTN: {
    AA: { action: "raise", frequency: 100, reasoning: "Premium hand - always raise from button" },
    KK: { action: "raise", frequency: 100, reasoning: "Premium hand - always raise" },
    QQ: { action: "raise", frequency: 100, reasoning: "Premium hand - always raise" },
    JJ: { action: "raise", frequency: 100, reasoning: "Strong hand - raise for value" },
    TT: { action: "raise", frequency: 95, reasoning: "Strong hand - raise most of the time" },
    AK: { action: "raise", frequency: 100, reasoning: "Premium drawing hand - always raise" },
    AQ: { action: "raise", frequency: 100, reasoning: "Strong hand - raise for value" },
    AJ: { action: "raise", frequency: 85, reasoning: "Good hand from button - raise frequently" },
    AT: { action: "raise", frequency: 75, reasoning: "Decent hand from button" },
    KQ: { action: "raise", frequency: 90, reasoning: "Strong broadways - raise frequently" },
    KJ: { action: "raise", frequency: 80, reasoning: "Good hand from button" },
    "99": { action: "raise", frequency: 90, reasoning: "Medium pocket pair - raise frequently" },
    "88": { action: "raise", frequency: 85, reasoning: "Medium pocket pair" },
    "77": { action: "raise", frequency: 75, reasoning: "Small-medium pair" },
    default: { action: "fold", frequency: 70, reasoning: "Weak hand - fold most of the time" },
  },
  CO: {
    AA: { action: "raise", frequency: 100, reasoning: "Premium hand - always raise" },
    KK: { action: "raise", frequency: 100, reasoning: "Premium hand - always raise" },
    QQ: { action: "raise", frequency: 100, reasoning: "Premium hand - always raise" },
    JJ: { action: "raise", frequency: 100, reasoning: "Strong hand - always raise" },
    TT: { action: "raise", frequency: 90, reasoning: "Strong hand - raise frequently" },
    AK: { action: "raise", frequency: 100, reasoning: "Premium drawing hand" },
    AQ: { action: "raise", frequency: 95, reasoning: "Strong hand - raise frequently" },
    AJ: { action: "raise", frequency: 75, reasoning: "Good hand from cutoff" },
    KQ: { action: "raise", frequency: 85, reasoning: "Strong broadways" },
    "99": { action: "raise", frequency: 85, reasoning: "Medium pocket pair" },
    "88": { action: "raise", frequency: 75, reasoning: "Medium pocket pair" },
    default: { action: "fold", frequency: 75, reasoning: "Weak hand - fold frequently" },
  },
  HJ: {
    AA: { action: "raise", frequency: 100, reasoning: "Premium hand - always raise" },
    KK: { action: "raise", frequency: 100, reasoning: "Premium hand - always raise" },
    QQ: { action: "raise", frequency: 100, reasoning: "Premium hand - always raise" },
    JJ: { action: "raise", frequency: 100, reasoning: "Strong hand - always raise" },
    TT: { action: "raise", frequency: 85, reasoning: "Strong hand from hijack" },
    AK: { action: "raise", frequency: 100, reasoning: "Premium drawing hand" },
    AQ: { action: "raise", frequency: 90, reasoning: "Strong hand" },
    AJ: { action: "raise", frequency: 65, reasoning: "Marginal from hijack" },
    KQ: { action: "raise", frequency: 75, reasoning: "Good broadways" },
    "99": { action: "raise", frequency: 80, reasoning: "Medium pocket pair" },
    default: { action: "fold", frequency: 80, reasoning: "Weak hand - fold most of the time" },
  },
  MP: {
    AA: { action: "raise", frequency: 100, reasoning: "Premium hand - always raise" },
    KK: { action: "raise", frequency: 100, reasoning: "Premium hand - always raise" },
    QQ: { action: "raise", frequency: 100, reasoning: "Premium hand - always raise" },
    JJ: { action: "raise", frequency: 100, reasoning: "Strong hand - always raise" },
    TT: { action: "raise", frequency: 80, reasoning: "Strong hand from middle position" },
    AK: { action: "raise", frequency: 100, reasoning: "Premium drawing hand" },
    AQ: { action: "raise", frequency: 85, reasoning: "Strong hand from MP" },
    AJ: { action: "fold", frequency: 60, reasoning: "Too weak from early position" },
    KQ: { action: "raise", frequency: 65, reasoning: "Marginal from MP" },
    "99": { action: "raise", frequency: 75, reasoning: "Medium pocket pair" },
    default: { action: "fold", frequency: 85, reasoning: "Weak hand - fold from early position" },
  },
  BB: {
    AA: { action: "raise", frequency: 100, reasoning: "Premium hand - 3-bet" },
    KK: { action: "raise", frequency: 100, reasoning: "Premium hand - 3-bet" },
    QQ: { action: "raise", frequency: 95, reasoning: "Strong hand - 3-bet frequently" },
    JJ: { action: "call", frequency: 60, reasoning: "Good hand - mix of call/3-bet" },
    TT: { action: "call", frequency: 70, reasoning: "Decent hand - call frequently" },
    AK: { action: "raise", frequency: 90, reasoning: "Premium drawing hand - 3-bet" },
    AQ: { action: "call", frequency: 65, reasoning: "Good hand - call frequently" },
    AJ: { action: "call", frequency: 55, reasoning: "Marginal - call sometimes" },
    KQ: { action: "call", frequency: 60, reasoning: "Decent broadways - call" },
    "99": { action: "call", frequency: 65, reasoning: "Medium pair - call" },
    default: { action: "fold", frequency: 70, reasoning: "Weak hand - fold to raise" },
  },
  SB: {
    AA: { action: "raise", frequency: 100, reasoning: "Premium hand - 3-bet" },
    KK: { action: "raise", frequency: 100, reasoning: "Premium hand - 3-bet" },
    QQ: { action: "raise", frequency: 90, reasoning: "Strong hand - 3-bet frequently" },
    JJ: { action: "call", frequency: 55, reasoning: "Good hand - mix strategies" },
    TT: { action: "call", frequency: 65, reasoning: "Decent hand from SB" },
    AK: { action: "raise", frequency: 85, reasoning: "Premium drawing hand" },
    AQ: { action: "call", frequency: 60, reasoning: "Good hand - call frequently" },
    AJ: { action: "fold", frequency: 55, reasoning: "Marginal from worst position" },
    KQ: { action: "call", frequency: 55, reasoning: "Marginal - call sometimes" },
    "99": { action: "call", frequency: 60, reasoning: "Medium pair - call" },
    default: { action: "fold", frequency: 75, reasoning: "Weak hand - fold from SB" },
  },
}

export default function PokerTrainer() {
  const [currentHand, setCurrentHand] = useState<Hand | null>(null)
  const [currentPosition, setCurrentPosition] = useState<Position>("BTN")
  const [userAction, setUserAction] = useState<Action | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [stats, setStats] = useState({ correct: 0, total: 0 })
  const [gameStarted, setGameStarted] = useState(false)

  // Create deck and deal hand
  const createDeck = (): PlayingCard[] => {
    const deck: PlayingCard[] = []
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        deck.push({ rank, suit })
      }
    }
    return deck
  }

  const shuffleDeck = (deck: PlayingCard[]): PlayingCard[] => {
    const shuffled = [...deck]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }

  const dealHand = (): Hand => {
    const deck = shuffleDeck(createDeck())
    const cards: [PlayingCard, PlayingCard] = [deck[0], deck[1]]

    // Create hand string (e.g., "AKs", "AKo", "AA")
    const [card1, card2] = cards
    let handString = ""

    if (card1.rank === card2.rank) {
      handString = card1.rank + card2.rank // Pocket pair
    } else {
      const ranks = [card1.rank, card2.rank].sort((a, b) => RANKS.indexOf(a) - RANKS.indexOf(b))
      handString = ranks[0] + ranks[1] + (card1.suit === card2.suit ? "s" : "o")
    }

    return { cards, handString }
  }

  const getGTOAction = (hand: string, position: Position): GTOAction => {
    const ranges = GTO_RANGES[position]
    return ranges[hand] || ranges["default"]
  }

  const dealNewHand = () => {
    const hand = dealHand()
    setCurrentHand(hand)
    setUserAction(null)
    setShowResult(false)

    // Rotate position
    const positions: Position[] = ["BTN", "CO", "HJ", "MP", "BB", "SB"]
    const currentIndex = positions.indexOf(currentPosition)
    const nextIndex = (currentIndex + 1) % positions.length
    setCurrentPosition(positions[nextIndex])

    if (!gameStarted) setGameStarted(true)
  }

  const handleAction = (action: Action) => {
    if (!currentHand) return

    setUserAction(action)
    setShowResult(true)

    const gtoAction = getGTOAction(currentHand.handString, currentPosition)
    const isCorrect = action === gtoAction.action

    setStats((prev) => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      total: prev.total + 1,
    }))
  }

  const resetStats = () => {
    setStats({ correct: 0, total: 0 })
  }

  const getCardColor = (suit: Suit) => {
    return suit === "♥" || suit === "♦" ? "text-red-600" : "text-gray-900"
  }

  const getPositionColor = (pos: Position) => {
    const colors = {
      BTN: "bg-green-100 text-green-800",
      CO: "bg-blue-100 text-blue-800",
      HJ: "bg-yellow-100 text-yellow-800",
      MP: "bg-orange-100 text-orange-800",
      BB: "bg-purple-100 text-purple-800",
      SB: "bg-red-100 text-red-800",
    }
    return colors[pos]
  }

  const winRate = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-green-900 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">GTO Poker Trainer</h1>
          <p className="text-green-200">Master optimal 6-handed preflop strategy</p>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Accuracy</p>
                  <p className="text-2xl font-bold">{winRate}%</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
              <Progress value={winRate} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Hands Played</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-green-600">{stats.correct} correct</p>
                  <p className="text-sm text-red-600">{stats.total - stats.correct} incorrect</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Current Position</p>
                  <Badge className={getPositionColor(currentPosition)}>{POSITIONS[currentPosition].fullName}</Badge>
                </div>
                <Button variant="outline" size="sm" onClick={resetStats}>
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Game Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Poker Table */}
          <div className="lg:col-span-2">
            <Card className="bg-green-800 border-green-700">
              <CardHeader>
                <CardTitle className="text-white text-center">
                  6-Handed Table - Position: {POSITIONS[currentPosition].fullName}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                {/* Table Layout */}
                <div className="relative w-full h-80 bg-green-700 rounded-full border-4 border-green-600 flex items-center justify-center">
                  {/* Position markers */}
                  <div className="absolute top-4 left-1/2 transform -translate-x-1/2">
                    <Badge className={currentPosition === "MP" ? "bg-yellow-500" : "bg-gray-500"}>MP</Badge>
                  </div>
                  <div className="absolute top-12 right-16">
                    <Badge className={currentPosition === "HJ" ? "bg-yellow-500" : "bg-gray-500"}>HJ</Badge>
                  </div>
                  <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                    <Badge className={currentPosition === "CO" ? "bg-yellow-500" : "bg-gray-500"}>CO</Badge>
                  </div>
                  <div className="absolute bottom-12 right-16">
                    <Badge className={currentPosition === "BTN" ? "bg-yellow-500" : "bg-gray-500"}>BTN</Badge>
                  </div>
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                    <Badge className={currentPosition === "SB" ? "bg-yellow-500" : "bg-gray-500"}>SB</Badge>
                  </div>
                  <div className="absolute bottom-12 left-16">
                    <Badge className={currentPosition === "BB" ? "bg-yellow-500" : "bg-gray-500"}>BB</Badge>
                  </div>

                  {/* Cards in center */}
                  {currentHand && (
                    <div className="flex gap-2">
                      {currentHand.cards.map((card, index) => (
                        <div
                          key={index}
                          className="w-16 h-24 bg-white rounded-lg border-2 border-gray-300 flex flex-col items-center justify-center shadow-lg"
                        >
                          <span className={`text-2xl font-bold ${getCardColor(card.suit)}`}>{card.rank}</span>
                          <span className={`text-xl ${getCardColor(card.suit)}`}>{card.suit}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex justify-center gap-4 mt-8">
                  {!gameStarted ? (
                    <Button onClick={dealNewHand} size="lg" className="bg-blue-600 hover:bg-blue-700">
                      <Shuffle className="h-5 w-5 mr-2" />
                      Start Training
                    </Button>
                  ) : !showResult ? (
                    <>
                      <Button
                        onClick={() => handleAction("fold")}
                        variant="destructive"
                        size="lg"
                        disabled={!currentHand}
                      >
                        Fold
                      </Button>
                      <Button
                        onClick={() => handleAction("call")}
                        variant="secondary"
                        size="lg"
                        disabled={!currentHand}
                      >
                        Call
                      </Button>
                      <Button
                        onClick={() => handleAction("raise")}
                        size="lg"
                        disabled={!currentHand}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Raise
                      </Button>
                    </>
                  ) : (
                    <Button onClick={dealNewHand} size="lg" className="bg-blue-600 hover:bg-blue-700">
                      <Shuffle className="h-5 w-5 mr-2" />
                      Next Hand
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Analysis Panel */}
          <div className="space-y-6">
            {/* Position Info */}
            <Card>
              <CardHeader>
                <CardTitle>Position Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge className={getPositionColor(currentPosition)} variant="secondary">
                  {POSITIONS[currentPosition].fullName}
                </Badge>
                <p className="text-sm text-muted-foreground mt-2">{POSITIONS[currentPosition].description}</p>
              </CardContent>
            </Card>

            {/* Hand Analysis */}
            {currentHand && (
              <Card>
                <CardHeader>
                  <CardTitle>Hand: {currentHand.handString}</CardTitle>
                </CardHeader>
                <CardContent>
                  {showResult && userAction && (
                    <div className="space-y-4">
                      {(() => {
                        const gtoAction = getGTOAction(currentHand.handString, currentPosition)
                        const isCorrect = userAction === gtoAction.action
                        return (
                          <>
                            <div
                              className={`p-3 rounded-lg ${isCorrect ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
                            >
                              <p className="font-semibold">{isCorrect ? "✓ Correct!" : "✗ Incorrect"}</p>
                              <p className="text-sm">
                                You chose: <strong>{userAction}</strong>
                              </p>
                              <p className="text-sm">
                                GTO recommends: <strong>{gtoAction.action}</strong> ({gtoAction.frequency}%)
                              </p>
                            </div>
                            <div className="p-3 bg-blue-50 rounded-lg">
                              <p className="text-sm text-blue-800">
                                <strong>Reasoning:</strong> {gtoAction.reasoning}
                              </p>
                            </div>
                          </>
                        )
                      })()}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Quick Reference */}
            <Card>
              <CardHeader>
                <CardTitle>Position Guide</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {Object.entries(POSITIONS).map(([pos, info]) => (
                  <div key={pos} className="flex items-center justify-between">
                    <Badge className={getPositionColor(pos as Position)} variant="outline">
                      {info.name}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{info.fullName}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
