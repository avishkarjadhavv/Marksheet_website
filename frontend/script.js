const API_BASE_URL =
    "https://marksheet-website-tdkw.vercel.app/api";


const loginForm =
    document.getElementById("loginForm");

const prnInput =
    document.getElementById("prn");

const passwordInput =
    document.getElementById("password");

const loginButton =
    document.getElementById("loginButton");

const loginMessage =
    document.getElementById("loginMessage");


// =================================
// Login
// =================================

loginForm.addEventListener(
    "submit",
    async function (event) {

        event.preventDefault();


        const prn =
            prnInput.value.trim();

        const password =
            passwordInput.value;


        loginMessage.textContent = "";

        loginMessage.style.color =
            "#d32f2f";


        loginButton.disabled = true;

        loginButton.textContent =
            "Logging in...";


        try {

            const response =
                await fetch(
                    `${API_BASE_URL}/login`,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({
                            prn: prn,
                            password: password
                        })
                    }
                );


            const data =
                await response.json();


            // =================================
            // Login Failed
            // =================================

            if (!response.ok) {

                loginMessage.textContent =
                    data.detail ||
                    "Invalid PRN or password.";

                return;

            }


            // =================================
            // Save JWT Token
            // =================================

            localStorage.setItem(
                "authToken",
                data.token
            );


            // =================================
            // Save User Information
            // =================================

            localStorage.setItem(
                "student",
                JSON.stringify(
                    data.student
                )
            );


            // =================================
            // Redirect Based On Role
            // =================================

            if (data.student.role === "admin") {

                window.location.href =
                    "admin.html";

            } else {

                window.location.href =
                    "dashboard.html";

            }

        }

        catch (error) {

            console.error(error);

            loginMessage.textContent =
                "Unable to connect to the server.";

        }

        finally {

            loginButton.disabled = false;

            loginButton.textContent =
                "Login";

        }

    }
);