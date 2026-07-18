import React, { useState, useContext } from "react"
import { useNavigate } from "react-router-dom"
import CssBaseline from "@mui/material/CssBaseline"
import Stack from "@mui/material/Stack"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import TextField from "@mui/material/TextField"
import Button from "@mui/material/Button"
import Card from "@mui/material/Card"
import Tabs from "@mui/material/Tabs"
import Tab from "@mui/material/Tab"
import IconButton from "@mui/material/IconButton"
import InputAdornment from "@mui/material/InputAdornment"
import { createTheme, ThemeProvider } from "@mui/material/styles"
import Snackbar from "@mui/material/Snackbar"

// Material UI Icons
import ArrowBackIcon from "@mui/icons-material/ArrowBack"
import Visibility from "@mui/icons-material/Visibility"
import VisibilityOff from "@mui/icons-material/VisibilityOff"

import { AuthContext } from "../context/AuthContext"

const darkTheme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#ff9839"
    },
    background: {
      default: "#05070c",
      paper: "rgba(12, 15, 23, 0.7)"
    },
    text: {
      primary: "#ffffff",
      secondary: "#a0aec0"
    }
  },
  typography: {
    fontFamily: "'Poppins', system-ui, sans-serif"
  },
  components: {
    MuiTextField: {
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": {
            backgroundColor: "rgba(255, 255, 255, 0.03)",
            borderRadius: "8px",
            transition: "all 0.2s ease",
            "& fieldset": {
              borderColor: "rgba(255, 255, 255, 0.08)"
            },
            "&:hover fieldset": {
              borderColor: "rgba(255, 255, 255, 0.2)"
            },
            "&.Mui-focused fieldset": {
              borderColor: "#ff9839",
              boxShadow: "0 0 0 4px rgba(255, 152, 57, 0.15)"
            }
          }
        }
      }
    }
  }
})

export default function Authentication() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState(0)
  const [name, setName] = useState("")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  
  // State to toggle the eye icon / password visibility
  const [showPassword, setShowPassword] = useState(false)
  
  const [error, setError] = useState(null)
  const [openSuccess, setOpenSuccess] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")

  const { handleLogin = async () => {}, handleRegister = async () => {} } = useContext(AuthContext) || {}

  const handleAuth = async (e) => {
    e.preventDefault()
    try {
      if (activeTab === 0) {
        const message = await handleLogin(username, password)
        console.log(message)
      } else {
        const message = await handleRegister(name, username, password)
        console.log(message)
        
        setSuccessMessage(message || "Registration successful! Please login.")
        setOpenSuccess(true)
        setActiveTab(0) 
        
        setName("")
        setPassword("")
      }
    } catch (error) {
      const errMsg = error.response?.data?.message || error.message || "An error occurred"
      console.error(errMsg)
      setError(errMsg)
    }
  }

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue)
    setError(null)
  }

  // Toggle dynamic visibility state
  const handleClickShowPassword = () => {
    setShowPassword(!showPassword)
  }

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Box
        sx={{
          minHeight: "100vh",
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "radial-gradient(circle at 75% 30%, #171127 0%, #05070c 65%)",
          padding: { xs: 2.5, sm: 4, md: 6 },
          position: "relative"
        }}
      >
        {/* Transparent Top-Left Back Button with Orange Accent Hover */}
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate("/")}
          sx={{
            position: "absolute",
            top: { xs: 20, sm: 30, md: 40 },
            left: { xs: 20, sm: 40, md: 60 },
            color: "rgba(255, 255, 255, 0.6)",
            textTransform: "none",
            fontWeight: 600,
            fontSize: "0.95rem",
            backgroundColor: "transparent",
            padding: "8px 16px",
            borderRadius: "8px",
            transition: "all 0.25s ease",
            "&:hover": {
              color: "#ff9839",
              backgroundColor: "rgba(255, 152, 57, 0.08)",
              transform: "translateX(-3px)"
            }
          }}
        >
          Back
        </Button>

        <Card
          sx={{
            padding: { xs: 4, sm: 5, md: 6 },
            width: "100%",
            maxWidth: { xs: "100%", sm: 480 },
            borderRadius: { xs: "16px", sm: "24px" },
            backdropFilter: "blur(16px) saturate(120%)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            boxShadow: "0 24px 60px rgba(0, 0, 0, 0.65)",
            background: "linear-gradient(145deg, rgba(12, 15, 23, 0.85) 0%, rgba(6, 8, 14, 0.95) 100%)",
            mx: "auto",
            mt: { xs: 6, sm: 0 }
          }}
        >
          <Stack gap={{ xs: 4, sm: 5 }}>
            <Stack alignItems="center" gap={1.5}>
              <Typography 
                variant="h4" 
                component="h1" 
                fontWeight={700} 
                textAlign="center"
                sx={{ 
                  letterSpacing: "-0.5px",
                  fontSize: { xs: "1.85rem", sm: "2.25rem" }
                }}
              >
                VibeMeet
              </Typography>
              <Typography 
                variant="body2" 
                color="text.secondary" 
                textAlign="center"
                sx={{ fontSize: { xs: "0.85rem", sm: "0.9rem" }, px: 2 }}
              >
                Experience high quality real-time connections
              </Typography>
            </Stack>

            <Tabs 
              value={activeTab} 
              onChange={handleTabChange} 
              variant="fullWidth"
              sx={{
                borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                "& .MuiTab-root": {
                  textTransform: "none",
                  fontWeight: 600,
                  fontSize: { xs: "0.9rem", sm: "1rem" },
                  color: "text.secondary",
                  pb: 2,
                  minWidth: 0
                },
                "& .Mui-selected": {
                  color: "#ff9839 !important"
                }
              }}
            >
              <Tab label="Login" />
              <Tab label="Register" />
            </Tabs>

            <Stack component="form" onSubmit={handleAuth} noValidate autoComplete="off">
              <Stack gap={2.5}>
                {activeTab === 1 && (
                  <TextField
                    label="Full Name"
                    variant="outlined"
                    fullWidth
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    placeholder="Enter your name"
                  />
                )}

                <TextField
                  label="Username"
                  variant="outlined"
                  fullWidth
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  placeholder="Enter username"
                />

                {/* Password field with dynamic show/hide toggle */}
                <TextField
                  label="Password"
                  type={showPassword ? "text" : "password"}
                  variant="outlined"
                  fullWidth
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  placeholder="••••••••"
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={handleClickShowPassword}
                          edge="end"
                          sx={{ color: "rgba(255, 255, 255, 0.45)" }}
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                />
              </Stack>

              {error && (
                <Typography style={{ color: "#e53e3e", fontSize: "0.85rem", marginTop: "12px" }}>
                  {error}
                </Typography>
              )}

              <Box sx={{ mt: 5 }}>
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  fullWidth
                  sx={{
                    color: "#ffffff",
                    fontWeight: 600,
                    padding: { xs: "14px 0", sm: "16px 0" },
                    textTransform: "none",
                    fontSize: { xs: "0.95rem", sm: "1rem" },
                    borderRadius: "8px",
                    background: "linear-gradient(90deg, #ff9839 0%, #e07f2b 100%)",
                    boxShadow: "0 4px 20px rgba(255, 152, 57, 0.25)",
                    "&:hover": {
                      background: "linear-gradient(90deg, #e07f2b 0%, #c76f22 100%)"
                    }
                  }}
                >
                  {activeTab === 0 ? "Sign In" : "Create Account"}
                </Button>
              </Box>
            </Stack>
          </Stack>
        </Card>
      </Box>

      <Snackbar
        open={Boolean(error)}
        autoHideDuration={6000}
        onClose={() => setError(null)}
        message={error || ""}
      />

      <Snackbar
        open={openSuccess}
        autoHideDuration={6000}
        onClose={() => setOpenSuccess(false)}
        message={successMessage}
      />
    </ThemeProvider>
  )
}