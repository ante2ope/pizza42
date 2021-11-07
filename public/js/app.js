// The Auth0 client, initialized in configureClient()
let auth0 = null;

/**
 * Starts the authentication flow
 */
const login = async (targetUrl) => {
  await auth0.loginWithRedirect({
    redirect_uri: window.location.origin
  });
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
  //document.getElementById("btn-call-api").disabled = !isAuthenticated;

  // NEW - add logic to show/hide gated content after authentication
  if (isAuthenticated) {
    var oUser = await auth0.getUser();
    const token = await auth0.getTokenSilently();
    document.getElementById("gated-content").classList.remove("hidden");

    document.getElementById("ipt-access-token").innerHTML = token;

    document.getElementById("ipt-user-profile").textContent = JSON.stringify(oUser);
    
    oProfileImg = document.getElementById("imgProfile");

    oProfileImg.src = oUser.picture;
    oProfileImg.width = "110";
    oProfileImg.height = "110";

    //unsure why, but email/validated is true for FB login ... w/o FB app verification, email isn't allowed!!
    var sEmail = "";
    var oEmail = oUser.email;
    if (oEmail) sEmail = oUser.email;
    document.getElementById("divProfileInfo").innerHTML = oUser.name + "<br/>" + sEmail;
  
    var params = { id: oUser.sub };
    const oGetUserProfile = await fetch("/api/getUserProfile", {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json; charset=utf-8" },
      method: 'POST',
      body: JSON.stringify({
        params: params
      })
    });

    const oResponseData = await oGetUserProfile.json();
    console.log(JSON.stringify(oResponseData));

    var oHistory = document.getElementById("History");
    createTable(oHistory, oUser.user_metadata.orders)

  } else {
    document.getElementById("gated-content").classList.add("hidden");
  }  
};

const callApi = async () => {
  try {

    // Get the access token from the Auth0 client
    const token = await auth0.getTokenSilently();
    const user = await auth0.getUser();

    console.log(JSON.stringify(user));

    if (!user.email_verified) {
      var r = alert("You must verify your email address before placing an order! Please follow the link in the email we sent to your address and try again.");
      return;
    } else {
      //check if any orders exist....
      var metadata = { "orders": []};
      if (user.meta_data) {
        metadata = user.meta_data;
      }
      metadata.orders.push(order);

      var params = { id: user.sub };
      const updateOrderResponse = await fetch("/api/updateUserProfile", {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json; charset=utf-8" },
        method: 'POST',
        body: JSON.stringify({
          params: params,
          metadata: metadata
        })
      });

      const oResponseData = await updateOrderResponse.json();
      console.log(JSON.stringify(oResponseData));

      if (oResponseData.msg == "this is my response to you!") alert("Thank you, your order has been placed!");
    }
    
    
  } catch (e) {
    // Display errors in the console
    console.error(e);
  }
};

