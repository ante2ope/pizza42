// The Auth0 client, initialized in configureClient()
let auth0 = null;

/**
 * Starts the authentication flow
 */
const login = async (targetUrl) => {
  await auth0.loginWithRedirect({
    redirect_uri: window.location.origin
  });
  /*
  try {
    console.log("Logging in", targetUrl);

    const options = {
      redirect_uri: window.location.origin
    };

    if (targetUrl) {
      options.appState = { targetUrl };
    }

    await auth0.loginWithRedirect(options);
  } catch (err) {
    console.log("Log in failed", err);
  }
  */

};

/**
 * Executes the logout flow
 */
const logout = () => {
  try {
    console.log("Logging out");
    auth0.logout({
      returnTo: window.location.origin
    });
  } catch (err) {
    console.log("Log out failed", err);
  }
};

/**
 * Retrieves the auth configuration from the server
 */
const fetchAuthConfig = () => fetch("/auth_config.json");

/**
 * Initializes the Auth0 client
 */
const configureClient = async () => {
  const response = await fetchAuthConfig();
  const config = await response.json();

  auth0 = await createAuth0Client({
    domain: config.domain,
    client_id: config.clientId,
    audience: config.audience
  });
};

/**
 * Checks to see if the user is authenticated. If so, `fn` is executed. Otherwise, the user
 * is prompted to log in
 * @param {*} fn The function to execute if the user is logged in
 */
const requireAuth = async (fn, targetUrl) => {
  const isAuthenticated = await auth0.isAuthenticated();

  if (isAuthenticated) {
    return fn();
  }

  return login(targetUrl);
};

// Will run when page finishes loading
window.onload = async () => {
  await configureClient();

  updateUI();

  /*
  // If unable to parse the history hash, default to the root URL
  if (!showContentFromUrl(window.location.pathname)) {
    showContentFromUrl("/");
    window.history.replaceState({ url: "/" }, {}, "/");
  }

  const bodyElement = document.getElementsByTagName("body")[0];

  // Listen out for clicks on any hyperlink that navigates to a #/ URL
  bodyElement.addEventListener("click", (e) => {
    if (isRouteLink(e.target)) {
      const url = e.target.getAttribute("href");

      if (showContentFromUrl(url)) {
        e.preventDefault();
        window.history.pushState({ url }, {}, url);
      }
    }
  });

  */
  const isAuthenticated = await auth0.isAuthenticated();

  if (isAuthenticated) {
    console.log("> User is authenticated");
    //window.history.replaceState({}, document.title, window.location.pathname);
    updateUI();
    return;
  }

  console.log("> User not authenticated");

  const query = window.location.search;
  const shouldParseResult = query.includes("code=") && query.includes("state=");

  if (shouldParseResult) {
    console.log("> Parsing redirect");
    try {
      const result = await auth0.handleRedirectCallback();

      if (result.appState && result.appState.targetUrl) {
        //showContentFromUrl(result.appState.targetUrl);
      }

      console.log("Logged in!");
    } catch (err) {
      console.log("Error parsing redirect:", err);
    }

    window.history.replaceState({}, document.title, "/");
  }
  
  updateUI();
};

const updateUI = async () => {
  const isAuthenticated = await auth0.isAuthenticated();

  document.getElementById("btn-logout").disabled = !isAuthenticated;
  document.getElementById("btn-login").disabled = isAuthenticated;
  document.getElementById("btn-call-api").disabled = !isAuthenticated;

  // NEW - add logic to show/hide gated content after authentication
  if (isAuthenticated) {
    var oUser = await auth0.getUser();
    document.getElementById("gated-content").classList.remove("hidden");

    document.getElementById(
      "ipt-access-token"
    ).innerHTML = await auth0.getTokenSilently();

    document.getElementById("ipt-user-profile").textContent = JSON.stringify(
      oUser
    );
    
    oProfileImg = document.getElementById("imgProfile");

    oProfileImg.src = oUser.picture;
    oProfileImg.width = "110";
    oProfileImg.height = "110";
    document.getElementById("divProfileInfo").innerHTML = oUser.name + "<br/>" + oUser.email;
  
  } else {
    document.getElementById("gated-content").classList.add("hidden");
  }  
};

const callApi = async () => {
  try {

    // Get the access token from the Auth0 client
    const token = await auth0.getTokenSilently();
    const user = await auth0.getUser();

    // Make the call to the API, setting the token
    // in the Authorization header
    const response = await fetch("/api/external", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    // Fetch the JSON result
    const responseData = await response.json();

    // Display the result in the output element
    const responseElement = document.getElementById("api-call-result");
    
    responseElement.innerText = JSON.stringify(order, {}, 2) + "<br/><br/>" + JSON.stringify(responseData, {}, 2);
    
    if (!user.email_verified) {
      var r = confirm("You must verify your email address before placing an order! Choose YES to re-send the confirmation email.");
      var params = {
        user_id: user.user_id
      };
      console.log("user object: ", user);

      var ManagementClient = require('auth0@2.9.1').ManagementClient;
      var management = new ManagementClient({
        token: auth0.accessToken,
        domain: auth0.domain
      });
      
      management.sendEmailVerification(params, function (err) {
       if (err) {
         // Handle error.
         console.log(err);
       }
       console.log("email sent?");

       callback(null, user, context);
      });
      return;
    }
    //just a test for me...
      var params = {
        user_id: user.user_id
      };
      console.log("user object: ", user);

      management.sendEmailVerification(params, function (err) {
       if (err) {
         // Handle error.
         console.log(err);
       }
       console.log("email sent?");

       callback(null, user, context);
      });

  } catch (e) {
    // Display errors in the console
    console.error(e);
  }
};

