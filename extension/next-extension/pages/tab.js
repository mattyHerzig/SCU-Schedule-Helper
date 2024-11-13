"use client";
import ResponsiveAppBar from "../components/ResponsiveAppBar";
import React, { useState } from "react";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

import Image from "next/image";
import GroupAddIcon from "@mui/icons-material/GroupAdd";
import SearchIcon from "@mui/icons-material/Search";
import BorderColorIcon from "@mui/icons-material/BorderColor";
import ArticleIcon from "@mui/icons-material/Article";
import Button from "@mui/material/Button";

export default function Home() {
  const [authStatus, setAuthStatus] = useState("checking");
  const [error, setError] = useState(null);

  return (
    <main sx={{ width: "100%", height: "100%" }}>
      <ResponsiveAppBar />
      <Box
        sx={{
          pl: 10,
          pr: 10,
          pt: 2,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 5,
          }}
        >
          <Typography variant="h3">Course Registration Made Easy</Typography>
          <Button
            variant="contained"
            color="primary"
            component="a"
            href="https://www.youtube.com/watch?v=iUMMb2LxTek"
            target="_blank"
          >
            View Demo
          </Button>
          <a href="#welcome" style={{ textDecoration: "none" }}>
            <Button variant="contained" color="primary">
              Get Started
            </Button>
          </a>
        </Box>
        <Image
          src="/embedded-pic.jpg"
          alt="course registration pic"
          width={700}
          height={400}
          style={{
            width: "100%",
            height: "auto",
            objectFit: "contain",
          }}
        />
      </Box>
      <Box
        sx={{
          p: 10,
          display: "grid",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Typography variant="h4">Features</Typography>
      </Box>
      <Box
        sx={{ display: "flex", justifyContent: "center", alignItems: "center" }}
      >
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 35,
          }}
        >
          <SearchIcon color="none" sx={{ fontSize: 60 }} />
          <GroupAddIcon color="none" sx={{ fontSize: 60 }} />
          <BorderColorIcon color="none" sx={{ fontSize: 60 }} />
          <ArticleIcon color="none" sx={{ fontSize: 60 }} />
        </Box>
      </Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          pt: 10,
        }}
      >
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 8,
          }}
        >
          <Typography>
            Search professor/class info in popup <br></br> (Under construction)
          </Typography>
          <Typography>
            Coordinate courses with friends <br></br> (Under construction)
          </Typography>
          <Typography>
            Highlight courses by your preferences <br></br> (Under construction)
          </Typography>
          <Typography>
            Generate course schedule with AI <br></br> (Under construction)
          </Typography>
        </Box>
      </Box>

      <Box
        sx={{
          display: "flex",
          pt: 10,
          pl: 10,
          pb: 10,
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <div id="welcome">
          <Typography variant="h5" sx={{ pt: 10 }}>
            Welcome to the SCU schedule helper
          </Typography>
        </div>
        <Typography sx={{ pt: 5 }}>
          Course registration can be tedious so we have designed a tool to help
          with the process. It is recommended to login with your scu email in
          order to access data from SCU course evaluations.
        </Typography>
      </Box>
    </main>
  );
}
