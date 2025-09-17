import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  ArrowLeft,
  Crown,
  Play,
  Pause,
  RotateCcw,
  Trash2,
  Brain,
  User,
  Clock,
  Target
} from 'lucide-react'
import { useKioskStore } from '../hooks/useKioskStore'

export default function ChessScreen() {
  const navigate = useNavigate()
  const [selectedSquare, setSelectedSquare] = useState(null)
  const [possibleMoves, setPossibleMoves] = useState([])
  const [gameMode, setGameMode] = useState('human') // 'human' or 'engine'
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  
  const {
    robotConnected,
    robotState,
    boardState,
    engineStatus,
    chessMove,
    telemetry
  } = useKioskStore()
  
  // Initialize chess board (8x8 grid)
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
  const ranks = ['8', '7', '6', '5', '4', '3', '2', '1']
  
  // Parse FEN to get piece positions
  const parseFEN = (fen) => {
    if (!fen) return {}
    
    const pieces = {}
    const boardPart = fen.split(' ')[0]
    const rows = boardPart.split('/')
    
    rows.forEach((row, rankIndex) => {
      let fileIndex = 0
      for (let char of row) {
        if (isNaN(char)) {
          // It's a piece
          const square = files[fileIndex] + ranks[rankIndex]
          pieces[square] = char
          fileIndex++
        } else {
          // It's a number (empty squares)
          fileIndex += parseInt(char)
        }
      }
    })
    
    return pieces
  }
  
  const pieces = boardState ? parseFEN(boardState.fen) : {}
  
  // Get piece symbol for display
  const getPieceSymbol = (piece) => {
    const symbols = {
      'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘', 'P': '♙',
      'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟'
    }
    return symbols[piece] || ''
  }
  
  // Handle square click
  const handleSquareClick = (square) => {
    if (!robotConnected || robotState !== 'READY') return
    
    if (selectedSquare === square) {
      // Deselect
      setSelectedSquare(null)
      setPossibleMoves([])
    } else if (selectedSquare && possibleMoves.includes(square)) {
      // Make move
      handleMove(selectedSquare, square)
    } else {
      // Select new square
      setSelectedSquare(square)
      // In a real implementation, calculate possible moves here
      setPossibleMoves([])
    }
  }
  
  // Handle chess move
  const handleMove = async (from, to) => {
    try {
      const success = await chessMove(from, to)
      if (success) {
        setSelectedSquare(null)
        setPossibleMoves([])
      }
    } catch (error) {
      console.error('Chess move failed:', error)
    }
  }
  
  // Handle engine analysis
  const handleAnalyze = async () => {
    if (!boardState) return
    
    setIsAnalyzing(true)
    try {
      // In a real implementation, call the analysis API
      console.log('Analyzing position:', boardState.fen)
    } catch (error) {
      console.error('Analysis failed:', error)
    } finally {
      setIsAnalyzing(false)
    }
  }
  
  // Get square color
  const getSquareColor = (file, rank) => {
    const fileIndex = files.indexOf(file)
    const rankIndex = ranks.indexOf(rank)
    const isLight = (fileIndex + rankIndex) % 2 === 0
    
    if (selectedSquare === file + rank) {
      return 'bg-blue-400'
    } else if (possibleMoves.includes(file + rank)) {
      return 'bg-green-300'
    } else {
      return isLight ? 'bg-amber-100' : 'bg-amber-800'
    }
  }
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm border-b p-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/dashboard')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <h1 className="text-2xl font-bold text-gray-900">Chess Game</h1>
          </div>
          
          <div className="flex items-center space-x-2">
            <Badge className={robotConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
              {robotConnected ? 'Connected' : 'Disconnected'}
            </Badge>
            <Badge className="bg-blue-100 text-blue-800">
              {robotState}
            </Badge>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chess Board */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Crown className="w-5 h-5" />
                    <span>Chess Board</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {boardState && (
                      <>
                        <Badge variant="outline">
                          Move {boardState.move_no}
                        </Badge>
                        <Badge className={boardState.turn === 'w' ? 'bg-gray-100 text-gray-800' : 'bg-gray-800 text-white'}>
                          {boardState.turn === 'w' ? 'White' : 'Black'} to move
                        </Badge>
                      </>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="aspect-square max-w-2xl mx-auto">
                  {/* Board */}
                  <div className="grid grid-cols-8 gap-0 border-4 border-amber-900 rounded-lg overflow-hidden">
                    {ranks.map((rank) =>
                      files.map((file) => {
                        const square = file + rank
                        const piece = pieces[square]
                        
                        return (
                          <div
                            key={square}
                            className={`
                              aspect-square flex items-center justify-center cursor-pointer
                              text-4xl md:text-5xl lg:text-6xl font-bold
                              hover:opacity-80 transition-all active:scale-95
                              ${getSquareColor(file, rank)}
                            `}
                            onClick={() => handleSquareClick(square)}
                          >
                            {piece && (
                              <span className={piece === piece.toUpperCase() ? 'text-white drop-shadow-lg' : 'text-black drop-shadow-lg'}>
                                {getPieceSymbol(piece)}
                              </span>
                            )}
                          </div>
                        )
                      })
                    )}
                  </div>
                  
                  {/* Coordinates */}
                  <div className="flex justify-between mt-2 px-2">
                    {files.map((file) => (
                      <div key={file} className="text-center text-sm font-semibold text-gray-600">
                        {file}
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Selected Square Info */}
                {selectedSquare && (
                  <div className="mt-4 text-center">
                    <Badge variant="outline" className="text-lg px-4 py-2">
                      Selected: {selectedSquare.toUpperCase()}
                      {pieces[selectedSquare] && ` (${getPieceSymbol(pieces[selectedSquare])})`}
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          {/* Game Controls */}
          <div className="space-y-6">
            {/* Game Mode */}
            <Card>
              <CardHeader>
                <CardTitle>Game Mode</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs value={gameMode} onValueChange={setGameMode}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="human" className="flex items-center space-x-2">
                      <User className="w-4 h-4" />
                      <span>Human</span>
                    </TabsTrigger>
                    <TabsTrigger value="engine" className="flex items-center space-x-2">
                      <Brain className="w-4 h-4" />
                      <span>Engine</span>
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </CardContent>
            </Card>
            
            {/* Game Status */}
            <Card>
              <CardHeader>
                <CardTitle>Game Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {boardState && (
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Turn:</span>
                      <Badge className={boardState.turn === 'w' ? 'bg-gray-100 text-gray-800' : 'bg-gray-800 text-white'}>
                        {boardState.turn === 'w' ? 'White' : 'Black'}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Move:</span>
                      <span>{boardState.move_no}</span>
                    </div>
                  </div>
                )}
                
                {engineStatus && (
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Engine:</span>
                      <Badge className={engineStatus.running ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                        {engineStatus.running ? 'Running' : 'Stopped'}
                      </Badge>
                    </div>
                    {engineStatus.bestmove && (
                      <div className="flex justify-between">
                        <span>Best Move:</span>
                        <span className="font-mono">{engineStatus.bestmove}</span>
                      </div>
                    )}
                    {engineStatus.eval !== null && (
                      <div className="flex justify-between">
                        <span>Evaluation:</span>
                        <span>{engineStatus.eval > 0 ? '+' : ''}{(engineStatus.eval / 100).toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Engine Controls */}
            <Card>
              <CardHeader>
                <CardTitle>Engine Controls</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  onClick={handleAnalyze}
                  disabled={!boardState || isAnalyzing}
                  className="w-full flex items-center space-x-2"
                >
                  <Brain className="w-4 h-4" />
                  <span>{isAnalyzing ? 'Analyzing...' : 'Analyze Position'}</span>
                </Button>
                
                <Button
                  variant="outline"
                  disabled={gameMode !== 'engine' || !robotConnected}
                  className="w-full flex items-center space-x-2"
                >
                  <Play className="w-4 h-4" />
                  <span>Engine Move</span>
                </Button>
              </CardContent>
            </Card>
            
            {/* Game Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Game Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full flex items-center space-x-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>New Game</span>
                </Button>
                
                <Button
                  variant="outline"
                  className="w-full flex items-center space-x-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Clear Board</span>
                </Button>
              </CardContent>
            </Card>
            
            {/* Robot Status */}
            {telemetry && (
              <Card>
                <CardHeader>
                  <CardTitle>Robot Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span>State:</span>
                    <Badge className="bg-blue-100 text-blue-800">
                      {robotState}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>TCP Speed:</span>
                    <span>{telemetry.tcp_speed.toFixed(3)} m/s</span>
                  </div>
                  {telemetry.program?.name && (
                    <div className="flex justify-between">
                      <span>Program:</span>
                      <span className="text-sm">{telemetry.program.name}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

