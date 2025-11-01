document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  
  // Auth elements
  const authBtn = document.getElementById("auth-btn");
  const authIcon = document.getElementById("auth-icon");
  const authText = document.getElementById("auth-text");
  const loginModal = document.getElementById("login-modal");
  const loginForm = document.getElementById("login-form");
  const loginMessage = document.getElementById("login-message");
  const closeModal = document.querySelector(".close");
  const signupContainer = document.getElementById("signup-container");
  const studentInfo = document.getElementById("student-info");
  
  // Auth state
  let currentTeacher = null;
  let authToken = null;

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft =
          details.max_participants - details.participants.length;

        // Create participants HTML with delete icons for teachers only
        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span>${currentTeacher ? `<button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button>` : ''}</li>`
                  )
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // Add event listeners to delete buttons (only for teachers)
      if (currentTeacher) {
        document.querySelectorAll(".delete-btn").forEach((button) => {
          button.addEventListener("click", handleUnregister);
        });
      }
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Authentication functions
  function updateAuthUI() {
    if (currentTeacher) {
      authIcon.textContent = "👩‍🏫";
      authText.textContent = `${currentTeacher.name} | Logout`;
      signupContainer.classList.remove("hidden");
      studentInfo.classList.add("hidden");
    } else {
      authIcon.textContent = "👤";
      authText.textContent = "Login";
      signupContainer.classList.add("hidden");
      studentInfo.classList.remove("hidden");
    }
    fetchActivities(); // Refresh to show/hide delete buttons
  }

  function getAuthHeaders() {
    if (authToken) {
      return {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      };
    }
    return {
      'Content-Type': 'application/json'
    };
  }

  // Handle unregister functionality (Teacher only)
  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    if (!currentTeacher) {
      alert("Please log in as a teacher to unregister students.");
      return;
    }

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
          headers: getAuthHeaders()
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to unregister. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission (Teacher only)
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!currentTeacher) {
      alert("Please log in as a teacher to sign up students.");
      return;
    }

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
          headers: getAuthHeaders()
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Auth button click handler
  authBtn.addEventListener("click", () => {
    if (currentTeacher) {
      // Logout
      currentTeacher = null;
      authToken = null;
      localStorage.removeItem("teacherToken");
      updateAuthUI();
    } else {
      // Show login modal
      loginModal.classList.remove("hidden");
    }
  });

  // Modal close handlers
  closeModal.addEventListener("click", () => {
    loginModal.classList.add("hidden");
  });

  loginModal.addEventListener("click", (event) => {
    if (event.target === loginModal) {
      loginModal.classList.add("hidden");
    }
  });

  // Login form submission
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("teacher-email").value;
    const password = document.getElementById("teacher-password").value;

    try {
      const response = await fetch("/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: `email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`
      });

      const result = await response.json();

      if (response.ok) {
        currentTeacher = result.teacher;
        authToken = result.token;
        localStorage.setItem("teacherToken", authToken);
        
        loginModal.classList.add("hidden");
        loginForm.reset();
        updateAuthUI();
        
        showMessage("Successfully logged in!", "success");
      } else {
        loginMessage.textContent = result.detail || "Login failed";
        loginMessage.className = "error";
        loginMessage.classList.remove("hidden");
      }
    } catch (error) {
      loginMessage.textContent = "Login failed. Please try again.";
      loginMessage.className = "error";
      loginMessage.classList.remove("hidden");
      console.error("Login error:", error);
    }
  });

  // Helper function to show messages
  function showMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.className = type;
    messageDiv.classList.remove("hidden");
    setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  }

  // Check for saved login on page load
  const savedToken = localStorage.getItem("teacherToken");
  if (savedToken) {
    authToken = savedToken;
    // Verify token is still valid
    fetch("/auth/verify", {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    })
    .then(response => response.json())
    .then(result => {
      if (result.authenticated) {
        currentTeacher = result.teacher;
        updateAuthUI();
      } else {
        localStorage.removeItem("teacherToken");
        authToken = null;
      }
    })
    .catch(() => {
      localStorage.removeItem("teacherToken");
      authToken = null;
    });
  }

  // Initialize app
  updateAuthUI();
  fetchActivities();
});
