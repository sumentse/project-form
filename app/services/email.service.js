// @ngInject
export default () => {
    let defaultDomain = "/";
    let digestValue = angular.element(document.querySelector("#__REQUESTDIGEST")).val();
    return {
        urlDomain: (urlLink) => {
            if (angular.isDefined(urlLink)) {
                defaultDomain = urlLink;
                return this;
            } else {
                return defaultDomain;
            }
        },
        $get: /*@ngInject*/ ($http, $q) => {
            return {
                getDigestValue: (complete = () => {}) => {

                    let deferred = $q.defer();

                    if (digestValue != null) {
                        complete(digestValue);
                        deferred.resolve(digestValue);
                    } else {

                        $http({
                            url: `${defaultDomain}/_api/contextinfo`,
                            async: true,
                            method: "POST",
                            headers: {
                                "accept": "application/json;odata=verbose",
                                "contentType": "text/xml"
                            }
                        }).then((response) => {
                            digestValue = response.data.d.GetContextWebInformation.FormDigestValue;
                            complete(digestValue);
                            deferred.resolve(digestValue);

                        }, (response) => {
                            alert("Cannot get digestValue.");
                            deferred.reject(response);

                        });

                    }

                    return deferred.promise;


                },
                /**
                 * Use for sending email on Sharepoint
                 * 
                 * @param  {String} url Sharepoint domain url
                 * @param  {Array} to Email addresses to send to
                 * @param  {String} from Original sender.
                 * @param  {String} body Message to send
                 * @param  {String} subject Email subject
                 * @param  {Promise} complete Response from server when email is successful
                 * @param  {Promise} failure Response from server when email did not send
                 * @return {Void}
                 */
                send: async function (to, from, body, subject, complete = () => {}, failure = () => {}) {

                    try {
                        if (!to) {
                            throw ("There is no email to be send to");
                        } else if (!angular.isArray(to)) {
                            throw ("The to variable needs to be an array");
                        }
                        if (!body) throw "There is no message in the body";
                    } catch (e) {
                        return;
                    }

                    const mail = {
                        properties: {
                            __metadata: {
                                "type": "SP.Utilities.EmailProperties"
                            },
                            From: (from) ? from : "",
                            To: {
                                "results": to
                            },
                            Body: body,
                            Subject: subject
                        }
                    };

                    $http({
                        url: `${defaultDomain}/_api/SP.Utilities.Utility.SendEmail`,
                        method: "POST",
                        data: angular.toJson(mail),
                        headers: {
                            "Content-Type": "application/json;odata=verbose",
                            "Accept": "application/json;odata=verbose",
                            "X-RequestDigest": await this.getDigestValue()
                        }
                    }).then(
                        (response) => {
                            complete(response);
                        },
                        (err) => {
                            failure(err);
                        }
                    );


                }
            };

        }
    }
};