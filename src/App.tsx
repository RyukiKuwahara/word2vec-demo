import { useState, useEffect } from 'react';
import { AppBar, Toolbar, Typography, TextField, Button, Container, List, ListItem, ListItemText, CircularProgress, Box, IconButton, Slider, MenuItem, Select, Autocomplete } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import './App.css';

const App = () => {
  const [inputWord, setInputWord] = useState('');
  const [inputWords, setInputWords] = useState<{ word: string; operation: 'add' | 'subtract' }[]>([
    { word: '王様', operation: 'add' },
    { word: '男', operation: 'subtract' },
    { word: '女', operation: 'add' },
  ]);
  const [similarWords, setSimilarWords] = useState<{ word: string; similarity: number }[]>([]);
  const [wordVectors, setWordVectors] = useState<{ [key: string]: number[] }>({});
  const [loading, setLoading] = useState(false);
  const [distanceMetric, setDistanceMetric] = useState<'cosine' | 'euclidean'>('cosine');
  const [similarWordsCount, setSimilarWordsCount] = useState<number>(10); // 類似単語の表示数

  const cosineSimilarity = (vecA: number[], vecB: number[]): number => {
    const dotProduct = vecA.reduce((sum, val, i) => sum + val * vecB[i], 0);
    const normA = Math.sqrt(vecA.reduce((sum, val) => sum + val * val, 0));
    const normB = Math.sqrt(vecB.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (normA * normB);
  };

  const euclideanDistance = (vecA: number[], vecB: number[]): number => {
    return Math.sqrt(vecA.reduce((sum, val, i) => sum + (val - vecB[i]) ** 2, 0));
  };

  const loadWordVectors = async () => {
    setLoading(true);
    const response = await fetch('chive-1.3-mc90-head10k.txt');
    const text = await response.text();
    const vectors: { [key: string]: number[] } = {};
    const lines = text.split('\n');
    for (const line of lines) {
      const parts = line.split(' ');
      const word = parts[0];
      const vector = parts.slice(1).map(Number);
      vectors[word] = vector;
    }
    setWordVectors(vectors);
    setLoading(false);
  };

  useEffect(() => {
    loadWordVectors();
  }, []);

  const addWord = () => {
    if (!inputWord.trim() || !wordVectors[inputWord]) {
      alert('有効な単語を入力してください');
      return;
    }
    setInputWords([...inputWords, { word: inputWord, operation: 'add' }]);
    setInputWord('');
  };

  const removeWord = (index: number) => {
    setInputWords(inputWords.filter((_, i) => i !== index));
  };

  const changeOperation = (index: number, operation: 'add' | 'subtract') => {
    const newWords = [...inputWords];
    newWords[index].operation = operation;
    setInputWords(newWords);
  };

  const calculateVector = (): number[] | null => {
    if (inputWords.length === 0) return null;
    let resultVector: number[] | null = null;
    for (const { word, operation } of inputWords) {
      const vector = wordVectors[word];
      if (!vector) continue;
      if (!resultVector) {
        resultVector = [...vector];
      } else {
        for (let i = 0; i < vector.length; i++) {
          resultVector[i] += operation === 'add' ? vector[i] : -vector[i];
        }
      }
    }
    return resultVector;
  };

  const handleSubmit = () => {
    const resultVector = calculateVector();
    if (!resultVector) {
      alert('単語を入力してください');
      return;
    }
  
    // inputWords に含まれる単語をセットにして除外
    const inputWordSet = new Set(inputWords.map(item => item.word));
  
    const similarities = Object.entries(wordVectors)
      .filter(([word]) => !inputWordSet.has(word)) // 除外処理を追加
      .map(([word, vector]) => ({
        word,
        similarity: distanceMetric === 'cosine' ? cosineSimilarity(resultVector, vector) : euclideanDistance(resultVector, vector),
      }));
  
    similarities.sort((a, b) => {
      if (distanceMetric === 'cosine') {
        return b.similarity - a.similarity; // コサイン類似度はそのまま降順で
      } else {
        return a.similarity - b.similarity; // ユークリッド距離は反転させて距離が小さい順に
      }
    });
    setSimilarWords(similarities.slice(0, similarWordsCount));
  };
  

  return (
    <>
      <AppBar position="sticky" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
        <Toolbar>
          <Typography variant="h6" style={{ flexGrow: 1, textAlign: 'center' }}>
            Word2Vec Demo
          </Typography>
        </Toolbar>
      </AppBar>
      <Container maxWidth="sm" className="container">
        <Typography variant="h4" gutterBottom className="title">
          単語の加減算と類似語検索
        </Typography>
        <Box display="flex">
        <Autocomplete
          freeSolo
          options={inputWord ? Object.keys(wordVectors) : []}  // 単語リストをサジェスト
          value={inputWord}
          onInputChange={(_, newValue) => setInputWord(newValue)}
          fullWidth
          renderInput={(params) => (
            <TextField {...params} label="単語を入力" variant="outlined" fullWidth />
          )}
        />
          <Button variant="contained" color="primary" onClick={addWord} disabled={loading}>
            追加
          </Button>
        </Box>
        <List>
          {inputWords.map((item, index) => (
            <ListItem key={index}>
              <Select value={item.operation} onChange={(e) => changeOperation(index, e.target.value as 'add' | 'subtract')}>
                <MenuItem value="add">+</MenuItem>
                <MenuItem value="subtract">-</MenuItem>
              </Select>
              <ListItemText primary={item.word} sx={{ ml: 2 }}/>
              <IconButton edge="end" aria-label="delete" onClick={() => removeWord(index)}>
                <DeleteIcon />
              </IconButton>
            </ListItem>
          ))}
        </List>
        <Box textAlign="center" mb={2}>
          <Typography variant="body1" gutterBottom>
            類似単語の表示数
          </Typography>
          <Slider
            value={similarWordsCount}
            onChange={(_e, newValue) => setSimilarWordsCount(newValue as number)}
            valueLabelDisplay="auto"
            valueLabelFormat={(value) => value}
            min={1}
            max={100}
            step={1}
            sx={{ width: '80%' }}
          />
          <Typography variant="body2" color="textSecondary">
            表示数 {similarWordsCount} 個
          </Typography>
        </Box>
        <Select value={distanceMetric} onChange={(e) => setDistanceMetric(e.target.value as 'cosine' | 'euclidean')} fullWidth>
          <MenuItem value="cosine">コサイン類似度</MenuItem>
          <MenuItem value="euclidean">ユークリッド距離</MenuItem>
        </Select>
        <Button variant="contained" color="secondary" onClick={handleSubmit} fullWidth sx={{ mt: 2 }} disabled={loading}>
          {loading ? <CircularProgress size={24} color="inherit" /> : '計算'}
        </Button>
        {similarWords.length > 0 && (
          <Box>
            <Typography variant="h5">類似する単語:</Typography>
            <List>
              {similarWords.map((item, index) => (
                <ListItem key={index}>
                  <ListItemText primary={`${item.word} (スコア: ${item.similarity.toFixed(4)})`} />
                </ListItem>
              ))}
            </List>
          </Box>
        )}
      </Container>
    </>
  );
};

export default App;
