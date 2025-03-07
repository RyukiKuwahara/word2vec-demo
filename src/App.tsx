import React, { useState, useEffect } from 'react';
import { AppBar, Toolbar, Typography, TextField, Button, Container, List, ListItem, ListItemText, CircularProgress, Box, IconButton, Select, MenuItem } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import './App.css';  // CSSをインポート

const App = () => {
  const [inputWord, setInputWord] = useState<string>('');
  const [inputWords, setInputWords] = useState<{ word: string; operation: 'add' | 'subtract' }[]>([]);
  const [similarWords, setSimilarWords] = useState<string[]>([]);
  const [wordVectors, setWordVectors] = useState<{ [key: string]: number[] }>({});
  const [loading, setLoading] = useState<boolean>(false);

  const cosineSimilarity = (vecA: number[], vecB: number[]): number => {
    const dotProduct = vecA.reduce((sum, val, i) => sum + val * vecB[i], 0);
    const normA = Math.sqrt(vecA.reduce((sum, val) => sum + val * val, 0));
    const normB = Math.sqrt(vecB.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (normA * normB);
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
    if (inputWord.trim() === '' || !wordVectors[inputWord]) {
      alert('有効な単語を入力してください');
      return;
    }
    setInputWords([...inputWords, { word: inputWord, operation: 'add' }]);
    setInputWord('');
  };

  const removeWord = (index: number) => {
    const newWords = [...inputWords];
    newWords.splice(index, 1);
    setInputWords(newWords);
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

      if (resultVector === null) {
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

    const similarities = Object.entries(wordVectors).map(([word, vector]) => {
      return { word, similarity: cosineSimilarity(resultVector, vector) };
    });

    similarities.sort((a, b) => b.similarity - a.similarity);
    setSimilarWords(similarities.slice(0, 3).map(item => item.word));
  };

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" style={{ flexGrow: 1, textAlign: 'center' }}>
            単語ベクトル計算アプリ
          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="sm" className="container">
        <Typography variant="h4" gutterBottom className="title">
          単語の加減算と類似語検索
        </Typography>

        <Box display="flex">
          <TextField
            label="単語を入力"
            variant="outlined"
            value={inputWord}
            onChange={(e) => setInputWord(e.target.value)}
            fullWidth
            className="input-field"
          />
          <Button variant="contained" color="primary" onClick={addWord} disabled={loading} className="add-button">
            追加
          </Button>
        </Box>

        <List className="word-list">
          {inputWords.map((item, index) => (
            <ListItem key={index} className="list-item">
              <Select
                value={item.operation}
                onChange={(e) => changeOperation(index, e.target.value as 'add' | 'subtract')}
                className="operation-select"
              >
                <MenuItem value="add">+</MenuItem>
                <MenuItem value="subtract">-</MenuItem>
              </Select>
              <ListItemText primary={item.word} className="word-text" />
              <IconButton edge="end" aria-label="delete" onClick={() => removeWord(index)}>
                <DeleteIcon />
              </IconButton>
            </ListItem>
          ))}
        </List>

        <Button
          variant="contained"
          color="secondary"
          onClick={handleSubmit}
          fullWidth
          disabled={loading}
          className="submit-button"
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : '計算'}
        </Button>

        {similarWords.length > 0 && (
          <Box className="result-list">
            <Typography variant="h5">類似する単語:</Typography>
            <List>
              {similarWords.map((word, index) => (
                <ListItem key={index} className="list-item">
                  <ListItemText primary={word} />
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
