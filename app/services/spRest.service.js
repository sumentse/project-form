import CryptoJS from 'crypto-js';

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
        $get: /*@ngInject*/ ($http, $q, _, naturalSort) => {
            return {
                /**
                 * Encode string to make it readable on Sharepoint filter
                 * @param  {String} theString String to encode
                 * @return {String}           Correct formatting
                 */
                encodeString: (theString) => {
                    return encodeURIComponent(theString).replace(/[']/g, (c)=>{
                        return '%' + c.charCodeAt(0).toString(16) + '%' + c.charCodeAt(0).toString(16);
                    })
                },
                /**
                 * Get the digest value
                 * @param  {Function} complete Will contain the digest value when completed on callback
                 * @return {Promise<String>}            Return the digest value when completed
                 *
                 * @example
                 * //get the digest value for methods that require POST
                 * spService.getDigestValue((digestValue)=>digestValue);
                 */
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
                 * Get a base64 encoding of a file
                 * @param  {Object} file the file input
                 * @return {Promise<response>}      return a promise of base64 encoding
                 *
                 * @example
                 * //return base64 url on given file
                 * spService.getDataURL('example.jpg')
                 *     .then((response)=>{
                 *         console.log(response);
                 *     });
                 */
                getDataURL: (file) => {
                    let deferred = $q.defer();

                    let reader = new FileReader();
                    reader.onloadend = (e) => {
                        deferred.resolve(e.target.result);
                    }
                    reader.onerror = (e) => {
                        deferred.reject(e.target.error);
                    }
                    reader.readAsDataURL(file);
                    return deferred.promise;
                },
                /**
                 * This takes in a file and split them into chunks to upload on a Sharepoint list
                 * @param  {String}   url      The domain of the website where the list is located
                 * @param  {String}   listname The name of the list to upload the file
                 * @param  {Number}   id       The item ID of where the attachment should go to
                 * @param  {Object}   file     The actual file input
                 * @param  {String=}   password If this is supply it will encrypt the file
                 * @param  {Function} status   Progress of the file upload
                 * @return {Promise<Boolean>}            Return a boolean when completed
                 *
                 * @example
                 * //upload a file into a base64 formated with encryption for list item that has an ID of 1
                 * spService.b64Upload('/sites/pub/forms', 'Example', 1, FileObj, 'examplepassword',
                 *     (progress) => {
                 *         console.log(progress);
                 *     }
                 * ).then(
                 *    (response) => {
                 *       console.log('file completed uploading');
                 *    }, 
                 *    (error) => {
                 * 
                 *    }
                 * );
                 */
                b64Upload: async function(url, listname, id, file, password = "", status = () => {}) {

                    let deferred = $q.defer();
                    //this will add chunking to list item for large file items

                    //base64
                    let theFile = await this.getDataURL(file);

                    //encrypt if there is a password
                    if (password.length >= 1 && password.length <= 8) {
                        return deferred.reject("Password must be greater than 8 characters");
                    }

                    let fileSize = password.length > 8 ? Math.ceil(theFile.length + (theFile.length * (33 / 100))) : theFile.length;
                    let chunkSize = password.length > 8 ? (1024 * 1024) * 36 : (1024 * 1024) * 49; //in bytes because sharepoint max is 52428800 bytes
                    let offset = 0;
                    let counter = 0;
                    let currentProgress = 0;
                    let currentSize = 0;


                    let chunkReaderBlock = async(_offset, length, _file) => {
                        let chunk = _file.slice(_offset, length + _offset);

                        if (chunk.length === 0) {
                            return deferred.resolve(true);
                        }

                        offset += chunk.length;


                        //upload a chunk
                        $http({
                            url: `${url}/_api/web/lists/GetByTitle('${listname}')/items(${id})/AttachmentFiles/add(FileName='part${counter}')`,
                            method: "POST",
                            data: password.length > 8 ? CryptoJS.AES.encrypt(chunk, password).toString() : chunk,
                            processData: false,
                            transformRequest: angular.identity,
                            headers: {
                                "Accept": "application/json;odata=verbose",
                                "X-RequestDigest": await this.getDigestValue()
                            },
                            uploadEventHandlers: {
                                progress: (e) => {

                                    if (e.loaded === e.total) {
                                        currentProgress = currentProgress + e.total;
                                    } else {
                                        currentSize = e.loaded + currentProgress;
                                    }

                                    status(Math.ceil((currentSize / fileSize) * 100));
                                }
                            }
                        }).then(
                            (response) => {


                                counter = counter + 1;

                                chunkReaderBlock(offset, chunkSize, theFile);
                            },
                            (error) => {
                                return deferred.reject(error);
                            }
                        );

                    }

                    chunkReaderBlock(offset, chunkSize, theFile);

                    return deferred.promise;
                },
                /**
                 * Download base64 encoding and converts into a file for download
                 * @param  {Array}  base64Files An array of base64 encoding that are done into parts
                 * @param  {Object} options     File configuration
                 * @param {String} options.name The name of the file
                 * @param {String} options.type The type of file mime
                 * @param {Boolean=} options.naturalSort Natural sort order is an ordering of strings in alphabetical order
                 * @param  {String=} password    password to decrypt the file
                 * @param  {Function} status      callback function for the progress of the download
                 *
                 * @example
                 * //combine the encrypted base64 parts into one complete file for download
                 * //assume that a zip file was added with encryption and was split into three parts
                 * spService.b64Download(
                 *     [
                 *         '/sites/pub/forms/Lists/Example/Attachments/1/part1',
                 *         '/sites/pub/forms/Lists/Example/Attachments/1/part2',
                 *         '/sites/pub/forms/Lists/Example/Attachments/1/part3'
                 *     ],
                 *     {
                 *         name: 'test.zip',
                 *         type: 'application/zip'
                 *     },
                 *     'examplepassword',
                 *     (progress)=>console.log(progress)
                 * );
                 * 
                 */
                b64Download: (base64Files = [], options = {}, password = "", status) => {

                    if (!angular.isArray(base64Files)) {
                        throw Error('You must supply an array of base64 files in order')
                    }

                    if (angular.isUndefined(options.name) || angular.isUndefined(options.type)) {
                        throw Error('You must give a file name and file type');
                    }

                    if (password.length >= 1 && password.length <= 8) {
                        return deferred.reject("Password must be greater than 8 characters");
                    }

                    angular.extend(options, {
                        naturalSort: options.naturalSort || true
                    });

                    let promises = [];
                    let fileParts = {};
                    let total = 0;
                    base64Files = options.naturalSort ? base64Files.sort(naturalSort) : base64Files;


                    const b64toBlob = (b64Data, contentType = '', sliceSize = 512) => {
                        const byteCharacters = atob(b64Data);
                        const byteArrays = [];

                        for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
                            const slice = byteCharacters.slice(offset, offset + sliceSize);

                            const byteNumbers = new Array(slice.length);
                            for (let i = 0; i < slice.length; i++) {
                                byteNumbers[i] = slice.charCodeAt(i);
                            }

                            const byteArray = new Uint8Array(byteNumbers);

                            byteArrays.push(byteArray);
                        }

                        const blob = new Blob(byteArrays, { type: contentType });
                        return blob;
                    }



                    let getFile = (url) => {
                        let deferred = $q.defer();

                        $http({
                            url,
                            method: 'GET',
                            responseType: 'text',
                            eventHandlers: {
                                progress: (e) => {
                                    fileParts[url.split('/').pop()] = Math.ceil((e.loaded / e.total) * 100);
                                    total = 0;
                                    for (const [key, value] of Object.entries(fileParts)) {
                                        total = total + value;
                                    }

                                    status(Math.ceil((total / (base64Files.length * 100)) * 100));

                                }
                            }
                        }).then(
                            (response) => {
                                deferred.resolve(response);
                            },
                            (error) => {
                                deferred.reject(error);
                            }
                        );

                        return deferred.promise;
                    }

                    //base64Files is the file path src and should be in sorted order
                    for (let i = 0, totalFiles = base64Files.length; i < totalFiles; i++) {
                        fileParts[base64Files[i].split('/').pop()] = 0;
                        promises.push(getFile(base64Files[i]));

                    }

                    $q.all(promises).then((data) => {
                        let completeFile = _.reduce(data, (base64String, curr) => {

                            if (password.length > 8) {
                                let bytes = CryptoJS.AES.decrypt(curr.data, password);
                                base64String += bytes.toString(CryptoJS.enc.Utf8);
                            } else {
                                base64String += curr.data;
                            }

                            return base64String;
                        }, "");



                        let blob = b64toBlob(completeFile.split(',')[1], options.type);

                        let linkElement = document.createElement('a')

                        let ieVersion = -1;
                        let ua, re;
                        if (navigator.appName == 'Microsoft Internet Explorer') {
                            ua = navigator.userAgent;
                            re = new RegExp("MSIE ([0-9]{1,}[\.0-9]{0,})");
                            if (re.exec(ua) != null)
                                ieVersion = parseFloat(RegExp.$1);
                        } else if (navigator.appName == 'Netscape') {
                            ua = navigator.userAgent;
                            re = new RegExp("Trident/.*rv:([0-9]{1,}[\.0-9]{0,})");
                            if (re.exec(ua) != null)
                                ieVersion = parseFloat(RegExp.$1);
                        }

                        if (ieVersion > 0 && ieVersion <= 11) {

                            window.navigator.msSaveOrOpenBlob(blob, options.name);

                        } else if (window.navigator.userAgent.indexOf("Edge") > -1) {

                            window.navigator.msSaveOrOpenBlob(blob, options.name);

                        } else {
                            //if not using Internet explorer or Edge
                            let url = window.URL.createObjectURL(blob);

                            linkElement.setAttribute('href', url);
                            linkElement.setAttribute('download', options.name);

                            let clickEvent = new MouseEvent("click", {
                                "view": window,
                                "bubbles": true,
                                "cancelable": false
                            });

                            linkElement.dispatchEvent(clickEvent);
                        }
                    });

                },
                /**
                 * Download a file attachment on a Sharepoint list
                 * @async
                 * @function downloadAttachment
                 * @param  {String} downloadLink Web link of the file
                 * @param  {Object} options      File configuration
                 * @param {String=} options.name Rename the file when downloading
                 * @param {String} options.type The type of file mime
                 * @return {Promise<Boolean>}        Return true when file is completed
                 *
                 * @example
                 * //do a direct file download for example.jpg
                 * spService.downloadAttachment('/sites/pub/forms/Lists/Example/Attachments/1/example.jpg', {
                 *     type: 'image/jpeg'
                 * });
                 */
                downloadAttachment: (downloadLink, options) => {

                    let deferred = $q.defer();

                    //Full File API support.

                    try {

                        if (window.FileReader && window.File && window.FileList && window.Blob) {

                            if (angular.isUndefined(downloadLink) || !angular.isString(downloadLink)) {
                                throw Error('You need to supply a download link');
                            }

                            if (angular.isUndefined(options.type)) {
                                throw Error('You need to supply the type of file for options');
                            }


                            let originalFileName = downloadLink.split('/').pop();

                            $http({
                                url: downloadLink,
                                method: 'GET',
                                responseType: 'arraybuffer'
                            }).then((response) => {

                                //download file logic if Microsoft Internet Explorer
                                let linkElement = document.createElement('a')

                                let ieVersion = -1;
                                let ua, re;
                                if (navigator.appName == 'Microsoft Internet Explorer') {
                                    ua = navigator.userAgent;
                                    re = new RegExp("MSIE ([0-9]{1,}[\.0-9]{0,})");
                                    if (re.exec(ua) != null)
                                        ieVersion = parseFloat(RegExp.$1);
                                } else if (navigator.appName == 'Netscape') {
                                    ua = navigator.userAgent;
                                    re = new RegExp("Trident/.*rv:([0-9]{1,}[\.0-9]{0,})");
                                    if (re.exec(ua) != null)
                                        ieVersion = parseFloat(RegExp.$1);
                                }

                                if (ieVersion > 0 && ieVersion <= 11) {

                                    window.navigator.msSaveOrOpenBlob(new Blob([response.data], { type: options.type }), options.name ? options.name : originalFileName);

                                } else if (window.navigator.userAgent.indexOf("Edge") > -1) {

                                    window.navigator.msSaveOrOpenBlob(new Blob([response.data], { type: options.type }), options.name ? options.name : originalFileName);

                                } else {
                                    //if not using Internet explorer or Edge
                                    let blob = new Blob([response.data], { type: options.type });
                                    let url = window.URL.createObjectURL(blob);

                                    linkElement.setAttribute('href', url);
                                    linkElement.setAttribute('download', options.name ? options.name : originalFileName);

                                    let clickEvent = new MouseEvent("click", {
                                        "view": window,
                                        "bubbles": true,
                                        "cancelable": false
                                    });

                                    linkElement.dispatchEvent(clickEvent);
                                }

                                deferred.resolve(true);



                            }, (response) => {
                                deferred.reject(response);
                            });

                        } else {
                            throw 'Cannot use these features as they are not supported in this browser';
                        }

                    } catch (err) {
                        deferred.resolve(false);
                        throw Error(err);
                    }

                    return deferred.promise;


                },
                /**
                 * Copy list items on List A into List B
                 * @param  {Object}   config     Initial setup
                 * @param {String} config.url The site domain of where the list is located
                 * @param {String} config.src The list name to make as a source to copy from
                 * @param {String} config.dest The list name to make as a destination to where to put the list items at
                 * @param {String} config.query A Sharepoint filter on what items you want copy on the Sharepoint list
                 * @param {Array<String>} config.srcFields Specific fields to copy
                 * @param  {responseWithIndex} complete   
                 * @param  {Function} failure    
                 * @param  {responseWithIndex}   fileStatus 
                 * @return {(Promise<responseWithIndex>|Promise<Boolean>)}              Progress of the upload
                 *
                 * @example
                 * let startCopy = async ()=>{
                 *     await spService.copyItems(
                 *         {
                 *             url: '/sites/pub/forms',
                 *             src: 'Example',
                 *             dest: 'ExampleCopy',
                 *             srcFields: ['Title','Category']
                 *         },
                 *         (response, index) => {
                 *             console.log(response, index);
                 *         },
                 *         (error, index) => {
                 *             console.log(error, index);
                 *         },
                 *         (progress, index) => {
                 *             console.log(progress, index);
                 *         }
                 *     );
                 * }
                 *
                 * startCopy();
                 */
                copyItems: function(config = {}, complete = () => {}, failure = () => {}, fileStatus) {
                    //this is use to copy from one sharepoint list to another
                    let dataTransferProcess = $q.defer();

                    this.getListItems(config.url, config.src, config.query,
                        async(response) => {

                            if (response.status === 200) {

                                let sourceData = response.data.d.results;

                                let getData = async() => {
                                    let deferred = $q.defer();
                                    let itemsToAdd = [];
                                    let mapData = _.map(sourceData, (item, index) => {
                                        return _.pickBy(item, (v, k) => {
                                            return _.includes(config.srcFields, k);
                                        });
                                    });

                                    for (let i = 0, totalItems = mapData.length; i < totalItems; i++) {

                                        //check if AttachmentFiles key is there
                                        if (!angular.isUndefined(mapData[i].AttachmentFiles)) {

                                            if (!angular.isUndefined(mapData[i].AttachmentFiles.results)) {
                                                //data show files
                                                let theFiles = mapData[i].AttachmentFiles.results;


                                                if (theFiles.length > 0) {
                                                    //at least one file
                                                    let filesToAttach = [];
                                                    for (let fileIndex = 0, totalFiles = theFiles.length; fileIndex < totalFiles; fileIndex++) {
                                                        let fileData = await this.getFile(theFiles[fileIndex].ServerRelativeUrl, { blob: false });
                                                        filesToAttach.push(fileData);
                                                    }

                                                    delete mapData[i].AttachmentFiles.results;

                                                    angular.extend(mapData[i], {
                                                        AttachmentFiles: filesToAttach
                                                    });

                                                } else {
                                                    delete mapData[i].AttachmentFiles;
                                                }
                                            }

                                        }
                                    }

                                    if (angular.isUndefined(config.keyMap)) {
                                        deferred.resolve(mapData);
                                    } else {

                                        if (!angular.isObject(config.keyMap)) {
                                            throw Error('keyMap must be an object');
                                        }

                                        deferred.resolve(
                                            _.map(mapData, (item) => {
                                                return _.mapKeys(item, (v, k) => {
                                                    return config.keyMap[k] ? config.keyMap[k] : k;
                                                });
                                            })
                                        );
                                    }

                                    return deferred.promise;
                                };


                                let itemsToAdd = await getData();

                                let isDone = await this.addListItems(config.url, config.dest, itemsToAdd,
                                    (response, index) => {
                                        complete(response, index);
                                    },
                                    (response, index) => {
                                        failure(response, index);
                                    },
                                    (response, index) => {
                                        fileStatus(response, index);
                                    }
                                );

                                dataTransferProcess.resolve(isDone);

                            } else {
                                throw Error('Fail to get items');
                                dataTransferProcess.resolve(false);
                            }
                        },
                        (err) => {
                            failure(err);
                        }
                    );

                    return dataTransferProcess.promise;
                },
                /**
                 * Counts all the items in a list
                 * @param  {String} url               The subdomain where the list is located
                 * @param  {String} listname          The name of the list
                 * @param  {String} query             Filter the items for count
                 * @return {Promise<Number>}          Total items
                 *
                 * @example
                 * //count list items with the status completed under the list 'Example'
                 * spService.countItems('/sites/pub/forms', 'Example', `?filter=Status eq 'Completed'`)
                 *     .then(
                 *         (response)=>{
                 *             console.log(response)
                 *         }
                 *     );
                 */
                countItems: (url, listname, query = '') => {

                    let queryCondition = null;
                    if (query === '' || angular.isUndefined(query)) {
                        queryCondition = '?$top=5000';
                    } else {
                        queryCondition = `${query}&$top=5000`;
                    }

                    let deferred = $q.defer();

                    $http({
                        url: `${url}/_api/web/lists/getbytitle('${listname}')/items${queryCondition}`,
                        method: 'GET',
                        headers: {
                            "Accept": "application/json; odata=verbose"
                        }
                    }).then((response) => {
                        deferred.resolve(response.data.d.results.length);
                    }, (response) => {
                        deferred.reject(response);
                    });

                    return deferred.promise;
                },
                /**
                 * Get the array buffer of a file
                 * @param  {Object} file The file object
                 * @return {Promise<Array>}      Return the array buffer
                 *
                 * @example
                 * //get file array buffer for example.jpg
                 * spService.getFileBuffer('/sites/pub/forms/Lists/Example/Attachments/1/example.jpg')
                 *     .then(
                 *        (response)=>{
                 *            console.log(response);
                 *        },
                 *        (error)=>{
                 *            console.log(error);
                 *        }
                 *     );
                 */
                getFileBuffer: (file) => {
                    let deferred = $q.defer();

                    let reader = new FileReader();
                    reader.onload = (e) => {
                        deferred.resolve(e.target.result);
                    }
                    reader.onerror = (e) => {
                        deferred.reject(e.target.error);
                    }
                    reader.readAsArrayBuffer(file);
                    return deferred.promise;

                },
                /**
                 * Get the file as an actual file or a blob
                 * @param  {String} fileURL Location of the attachment in a list item
                 * @param  {Object} options configuration of the data
                 * @param {Boolean} options.blob If you want it as a blob, false will be a file
                 * @param {String} options.filename Renaming the file
                 * @return {Promise<Object>}         Return a blob or a file
                 *
                 * @example
                 *
                 * //fetch the file data
                 * spService.getFile('/sites/pub/forms/Lists/Example/Attachments/1/example.jpg', {
                 *     blob: true,
                 *     filename: 'renaming_file.jpg'
                 * }).then((response)=>{
                 *     console.log(response);
                 * }, (error)=>{
                 *     console.log(error);
                 * });
                 */
                getFile: (fileURL, options = { blob: true, filename: null }) => {
                    let deferred = $q.defer();

                    $http({
                        url: fileURL,
                        method: 'GET',
                        responseType: 'blob'
                    }).then((response) => {
                        if (options.blob) {
                            deferred.resolve(response);
                        } else {
                            if (options.filename) {
                                let blobObj = response.data;
                                blobObj.lastModifiedDate = new Date();
                                blobObj.name = options.filename;
                                deferred.resolve(blobObj);
                            } else {
                                let blobObj = response.data;
                                blobObj.lastModifiedData = new Date();
                                blobObj.name = fileURL.split('/').pop();
                                deferred.resolve(blobObj);
                            }
                        }
                    }, (response) => {
                        deferred.reject(response);
                    });

                    return deferred.promise;
                },
                /**
                 * Search users on Sharepoint
                 * @param  {String}   query    Email or the person Name
                 * @param  {Number}   limit    The amount of users return
                 * @param  {response} complete Contains all the users found on callback
                 * @param  {response} failure
                 *
                 * @example
                 * //search users with last name Smith and limit the results to just 20
                 * spService.searchUser('Smith', 20,
                 *     (response)=>{
                 *         console.log(response.data.d.results);
                 *     },
                 *     (error)=>{
                 *     
                 *     }
                 * );
                 */
                searchUser: (query, limit, complete = () => {}, failure = () => {}) => {

                    $http({
                        url: `${defaultDomain}/_api/web/SiteUsers?$filter=Email ne '' and ( substringof('${query}',Title) or substringof('${query}',Email) )&$top=${limit}`,
                        method: 'GET',
                        headers: {
                            "Accept": "application/json; odata=verbose"
                        }
                    }).then((response) => {
                        complete(response);
                    }, (response) => {
                        failure(response);
                    });

                },
                /**
                 * Adding a file attachment onto a list
                 * @param  {String}   url            The subdomain of where the list is located at
                 * @param  {String}   listname       The list name of where the file should be attach at
                 * @param  {Number}   id             The item ID of a Sharepoint list item
                 * @param  {String}   fileName       The name of the file you want to give
                 * @param  {Object}   file           A file object
                 * @param  {progressCB} uploadProgress Callback function of the progress of the file being uploaded
                 * @return {response}                  Server response of successful upload or failure
                 */
                addListFileAttachment: async function(url, listname, id, fileName, file, uploadProgress = () => {}) {

                    let deferred = $q.defer();

                    //cleans the string to correct name that is acceptable on sharepoint.
                    try {
                        let cleanStrFileName = fileName.replace(/^\.+|([|\/&;$%:#~?^{}*'@"<>()+,])|\.+$/g, "");
                        cleanStrFileName = cleanStrFileName.substr(-128);

                        //you can only add or delete the list item but it will be different in documents
                        $http({
                            url: `${url}/_api/web/lists/GetByTitle('${listname}')/items(${id})/AttachmentFiles/add(FileName='${cleanStrFileName}')`,
                            method: "POST",
                            data: await this.getFileBuffer(file),
                            processData: false,
                            transformRequest: angular.identity,
                            headers: {
                                "Accept": "application/json;odata=verbose",
                                "X-RequestDigest": await this.getDigestValue()
                            },
                            uploadEventHandlers: {
                                progress: (e) => {
                                    uploadProgress(Math.ceil((e.loaded / e.total) * 100));
                                }
                            }
                        }).then((response) => {
                            deferred.resolve(response);
                        }, (response) => {
                            deferred.reject(response);
                        });


                    } catch (e) {
                        throw Error("Filename was not supply");
                    }

                    return deferred.promise;


                },
                /**
                 * Uploading multiple file attachments on a Sharepoint list item
                 * @param {String} url             The subdomain of where the list is located at
                 * @param {String} listname        The list name of where the file should be attached at
                 * @param {Number} id              the item ID of a Sharepoint list item
                 * @param {Array<Object>} AttachmentFiles A FileList
                 * @param {Array<Object>} AttachmentFiles.files The file list
                 * @param {String=} AttachmentFiles.prefix Adding a prefix with each file upload
                 * @param {responseWithIndex} status          Server response and a count of files that are uploaded
                 * @return {(Promise<Boolean>|Promise<response>)} If successful will return a Boolean of true otherwise a server response with the index of the fail file upload
                 * @example
                 * //this will attach multiple files on the list 'Example' from '/sites/pub/forms' that has a list item with an ID of 1
                 * let startUploading = async()=> {
                 *     let isDone = await spService.addListFileAttachments('/sites/pub/forms', 'Example', 1, {files:FileList}, (response, index)=>{
                 *         console.log(response, index);
                 *     }, (progress)=>{
                 *          console.log(progress);
                 *     });
                 *
                 *     if(isDone){
                 *         console.log('The file has finish uploading');
                 *     }
                 * }
                 *
                 * startUploading();
                 */
                addListFileAttachments: function(url, listname, id, AttachmentFiles, success, progressEvent) {

                    let deferred = $q.defer();
                    let progress = 0;
                    let loaded = 0;
                    const totalFiles = AttachmentFiles.files.length;
                    const filePerPercentage = 100 / totalFiles;

                    try {
                        let addItem = async(i) => {

                            if (AttachmentFiles.files.length !== i) {

                                let cleanStrFileName = AttachmentFiles.files[i].name.replace(/^\.+|([|\/&;$%:#~?^{}*'@"<>()+,])|\.+$/g, "");
                                cleanStrFileName = cleanStrFileName.substr(-128);

                                //you can only add or delete the list item but it will be different in documents
                                $http({
                                    url: `${url}/_api/web/lists/GetByTitle('${listname}')/items(${id})/AttachmentFiles/add(FileName='${AttachmentFiles.prefix ? AttachmentFiles.prefix : ''}${cleanStrFileName}')`,
                                    method: "POST",
                                    data: await this.getFileBuffer(AttachmentFiles.files[i]),
                                    processData: false,
                                    transformRequest: angular.identity,
                                    headers: {
                                        "Accept": "application/json;odata=verbose",
                                        "X-RequestDigest": await this.getDigestValue()
                                    },
                                    uploadEventHandlers: {
                                        progress: (e) => {
                                                
                                            progress = loaded + (e.loaded / e.total) * filePerPercentage;

                                            if(e.loaded === e.total){
                                                loaded = progress;
                                            }
                                            
                                            progressEvent(Math.ceil(progress));

                                        }
                                    }
                                }).then((response) => {
                                    success(response, i);
                                    addItem(i + 1);
                                }, (response) => {

                                    deferred.reject(response, i);

                                });



                            } else {
                                deferred.resolve(true);
                            }


                        }

                        addItem(0);

                    } catch (err) {
                        throw Error(err);
                    }


                    return deferred.promise;

                },
                /**
                 * Delete a file attachment on a Sharepoint list item
                 * @param  {String} url      Subdomain of where the list is located
                 * @param  {String} listname The listname of where the file is located
                 * @param  {Number} id       The Sharepoint list item ID
                 * @param  {Object} fileName A file object
                 * @return {Promise}          Server response when successful/failure
                 *
                 * @example
                 * //This will delete the file attachment on a list item
                 * let deleteItem = async(id)=>{
                 *     await spService.deleteListFileAttachment('/sites/pub/forms', 'Example', id, 'myFile.pdf');
                 * }
                 *
                 * deleteItem(1);
                 * 
                 */
                deleteListFileAttachment: async function(url, listname, id, fileName) {
                    let deferred = $q.defer();

                    $http({
                        url: `${url}/_api/web/lists/GetByTitle('${listname}')/items(${id})/AttachmentFiles/getByFileName('${fileName}')`,
                        method: "POST",
                        headers: {
                            "Accept": "application/json;odata=verbose",
                            "X-Http-Method": "DELETE",
                            "X-RequestDigest": await this.getDigestValue(),
                        }
                    }).then((response) => {
                        deferred.resolve(response);
                    }, (response) => {
                        deferred.reject(response);
                    });

                    return deferred.promise;

                },
                /**
                 * This will delete all the file attachments on a Sharepoint list item
                 * @param  {String} url      The subdomain of where the list is located
                 * @param  {String} listname The list name of where the file is attached on
                 * @param  {Number} id       The list item to delete the attachments
                 * @param  {responseWithIndex} status   
                 * @return {(Promise<Boolean>|Promise<response>)}          Return a boolean when it's finish deleting all the attachments on that list item
                 *
                 * @example
                 * //this will delete all the file attachment with an list item of ID 1 on the 'Example' list
                 * let deleteAllFileAttachments = async (id) => {
                 *     try {
                 *         let isDone = await spService.emptyListFileAttachments('/sites/pub/forms', 'Example', 1, (response, index)=>{ console.log(response,index); });
                 *         
                 *         if(isDone){
                 *             console.log('Attachments are deleted');
                 *         }
                 *     
                 *     } catch (err){
                 *         console.log(err);
                 *     }
                 *
                 * }
                 *
                 * deleteAllFileAttachments(1);
                 */
                emptyListFileAttachments: function(url, listname, id, status) {
                    //this method will remove all the file attachment
                    let deferred = $q.defer();

                    this.getListItem(url, listname, id, '?$expand=AttachmentFiles',
                        async(res) => {

                            let documents = _.reduce(res.data.d.AttachmentFiles.results, (files, curr) => {
                                files.push(curr.ServerRelativeUrl)
                                return files;
                            }, []);

                            await this.deleteListFileAttachments(url, listname, id, documents, (response, index) => {
                                status(response, index);
                            });

                            deferred.resolve(true);
                        },
                        (err) => {
                            deferred.reject(err);
                        }
                    );

                    return deferred.promise;
                },
                /**
                 * Explicitly delete file attachments
                 * @param  {String} url          The subdomain of where the list is located
                 * @param  {String} listname     The list name of where the file is attached on
                 * @param  {Number} id           The list item to delete the attachments
                 * @param  {Array<String>}  fileNameList An array of file attachment url or name
                 * @param  {responseWithIndex} status       Server response and a count of files that are deleted
                 * @return {(Promise<Boolean>|Promise<responseWithIndex>)}              Return a boolean of True when finish or the server response when an error occurs with the index number
                 *
                 * @example
                 * //delete specific file attachments on a list item that has an ID of 4
                 * spService.deleteListFileAttachments('/sites/pub/forms', 'Example', 4, ['Example.jpg', 'Example2.jpg'],
                 *     (response, index)=>{
                 *         console.log(response, index);
                 *     }
                 * ).then((response)=>console.log('successful'),(error)=>console.log('failure'));
                 */
                deleteListFileAttachments: function(url, listname, id, fileNameList = [], status) {
                    let deferred = $q.defer();

                    try {

                        let deleteItem = async(i) => {
                            if (fileNameList.length !== i) {
                                //check if it's a path or not
                                let file = fileNameList[i];
                                let hasPath = file.split('/').length > 1 ? true : false;
                                let fileName = null;

                                if (hasPath) {
                                    fileName = file.split('/').pop();
                                } else {
                                    fileName = file;
                                }

                                $http({
                                    url: `${url}/_api/web/lists/GetByTitle('${listname}')/items(${id})/AttachmentFiles/getByFileName('${fileName}')`,
                                    method: "POST",
                                    headers: {
                                        "Accept": "application/json;odata=verbose",
                                        "X-Http-Method": "DELETE",
                                        "X-RequestDigest": await this.getDigestValue(),
                                    }
                                }).then((response) => {
                                    status(response, i);
                                    deleteItem(i + 1);
                                }, (response) => {
                                    deferred.reject(response, i);
                                });

                            } else {
                                deferred.resolve(true);
                            }
                        };

                        deleteItem(0);


                    } catch (err) {
                        deferred.reject(err);
                    }

                    return deferred.promise;
                },
                /**
                 * Generate list item type
                 * @param  {String} name The name of the Sharepoint list
                 * @return {String}      return list item type name
                 *
                 * @example
                 * spService.getListItemType('Hello World');
                 * //return "Hello_x0020_World"
                 */
                getListItemType: (name) => {
                    return (`SP.Data.${name[0].toUpperCase() + name.substring(1)}ListItem`).replace(/\s/g, "_x0020_");
                },
                /**
                 * Get a single list item from a list
                 * @param  {String}   url      The subdomain of where the list is located
                 * @param  {String}   listname The list name of where the list item is located
                 * @param  {Number}   id       The list item ID
                 * @param  {String=}   query    Sharepoint OData query operations in Sharepoint Rest requests
                 * @param  {response} complete A successful server response
                 * @param  {response} failure  A fail server response
                 * @example
                 *
                 * spService.getListItem('/sites/pub/forms', 'Example', 1, '?$select=Title&$expand=FileAttachments',
                 *     (res)=>{
                 *         console.log(res.data.d);
                 *         //returns list item with an ID of 1 showing only the Title and if there are any file attachments
                 *     },   
                 *     (err)=>{
                 *     
                 *     }
                 * );
                 *
                 * 
                 */
                getListItem: (url, listname, id, query = "", complete = () => {}, failure = () => {}) => {

                    $http({
                        url: `${url}/_api/web/lists/getbytitle('${listname}')/items('${id}')${query}`,
                        method: "GET",
                        headers: {
                            "Accept": "application/json; odata=verbose"
                        }
                    }).then((response) => {
                        complete(response);
                    }, (response) => {
                        failure(response);
                    });


                },
                /**
                 * Get an array of list item objects from a Sharepoint list
                 * @param  {String}   url      The subdomain of where the list is located
                 * @param  {String}   listname The list name of where the list item is located
                 * @param  {String=}   query    Sharepoint OData query operations in Sharepoint Rest requests
                 * @param  {response} complete Callback function that will return sharepoint list items
                 * @param  {response} failure  A fail server response
                 *
                 * @example
                 * //this will get 20 Sharepoint list items on a list name 'Example'
                 * spService.getListItems('/sites/pub/forms', 'Example', '?$top=20',
                 *     (res)=>{
                 *         console.log(res.data.d.results);
                 *         //this will contain the results of the list items that were found on the list name 'Example'
                 *     },
                 *     (err)=>{
                 *     
                 *     }
                 * );
                 */
                getListItems: (url, listname, query = "", complete = () => {}, failure = () => {}) => {
                    // Executing our items via an ajax request
                    $http({
                        url: `${url}/_api/web/lists/getbytitle('${listname}')/items${query}`,
                        method: "GET",
                        headers: {
                            "Accept": "application/json; odata=verbose"
                        }
                    }).then((response) => {
                        complete(response);
                    }, (response) => {
                        failure(response);
                    });

                },
                /**
                 * Uses Sharepoint caml query to get list items
                 * @typedef {Class} camlQuery
                 * 
                 * @param  {String} url         The site domain of where the list items are located
                 * @param  {Object} queryOption The query object
                 * @param {Number} pageSize Determine the page size of the number of items that should be return
                 * @param {String} listName The name of the list for where the list items are located
                 * @param {Boolean} pagesInArray True if you want the pages as array otherwise will give a number
                 * 
                 * @return {Object}             Return an camlQuery object
                 *
                 */
                camlQuery: function(url, queryOption) {

                    if (!SP) {
                        new Error('SP Core does not exist');
                    }

                    let parser = new DOMParser();
                    let oSerializer = new XMLSerializer();
                    let context = angular.isDefined(url) ? new SP.ClientContext(url) : new SP.ClientContext.get_current();
                    let spItems;
                    let position;
                    let nextPagingInfo;
                    let previousPagingInfo;
                    let pageIndex = 1;
                    let pageSize = angular.isDefined(queryOption.pageSize) ? queryOption.pageSize : 25;
                    let list = context.get_web().get_lists().getByTitle(queryOption.listName);
                    let camlQuery = new SP.CamlQuery();
                    let countQuery = new SP.CamlQuery();
                    let query;
                    let doc;
                    let pageInformation;
                    let items;

                    return {
                        setXML: function(xml) {
                            query = xml;
                            doc = parser.parseFromString(query, "text/xml");
                        },
                        next: function() {
                            //note: when implementing this it is best to use the try and catch for type Error
                            return new Promise(async(resolve) => {
                                if (nextPagingInfo) {
                                    pageIndex = pageIndex + 1;
                                    position = new SP.ListItemCollectionPosition();
                                    position.set_pagingInfo(nextPagingInfo);
                                    let { items, pageInformation } = await this.GetListItems();
                                    resolve({ items, pageInformation });

                                } else {
                                    resolve();
                                }

                            })
                        },
                        back: function() {

                            return new Promise(async(resolve) => {
                                if (pageIndex <= 1) {
                                    return resolve();
                                }

                                pageIndex = pageIndex - 1;
                                position = new SP.ListItemCollectionPosition();
                                position.set_pagingInfo(previousPagingInfo);
                                let { items, pageInformation } = await this.GetListItems();
                                resolve({ items, pageInformation });

                            });
                        },
                        getPageInforation: function() {
                            return pageInformation;
                        },
                        getPaginationCount: function() {
                            //it's best to use this if there are not too many items
                            return new Promise((resolve, reject) => {

                                //check if there is a where node
                                let nodes = doc.querySelectorAll('Where');
                                if (nodes.length > 0) {
                                    let [where] = nodes;

                                    countQuery.set_viewXml(`
                                        <View>
                                            <Query>
                                                <ViewFields>
                                                    <FieldRef Name='ID'/>
                                                </ViewFields>
                                                ${oSerializer.serializeToString(where)}
                                            </Query>
                                            <RowLimit>5000</RowLimit>
                                        </View>
                                    `);

                                } else {
                                    countQuery.set_viewXml(`
                                        <View>
                                            <Query>
                                                <ViewFields>
                                                    <FieldRef Name='ID'/>
                                                </ViewFields>
                                            </Query>
                                            <RowLimit>5000</RowLimit>
                                        </View>
                                    `);
                                }


                                spItems = list.getItems(countQuery);

                                context.load(spItems);
                                context.executeQueryAsync(
                                    function() {
                                        let listEnumerator = spItems.getEnumerator();
                                        let counter = 0;
                                        let totalPages = 0;
                                        let pages = [];

                                        while (listEnumerator.moveNext()) {
                                            counter = counter + 1;
                                        }

                                        totalPages = Math.ceil(counter / pageSize);

                                        for (let i = 1; i <= totalPages; i++) {
                                            pages.push(i);
                                        }

                                        resolve({
                                            total: counter,
                                            pages: queryOption.pagesInArray ? pages : totalPages
                                        });

                                    },
                                    function(sender, args) {
                                        reject('Failed to get items. Error:' + args.get_message());
                                    }
                                );


                            });
                        },
                        GetListItems: function(goToPage) {
                            //Set the next or back list items collection position 
                            //First time the position will be null 
                            let self = this;

                            return new Promise((resolve, reject) => {



                                // Create a CAML view that retrieves all contacts items  with assigne RowLimit value to the query 
                                if (goToPage) {

                                    camlQuery.set_listItemCollectionPosition(null);
                                    camlQuery.set_viewXml(`<View>${query.replace(/(\<View\>|\<\/View\>)/gi,'')}<RowLimit>${pageSize * goToPage}</RowLimit></View>`);
                                    spItems = list.getItems(camlQuery);

                                    context.load(spItems);
                                    context.executeQueryAsync(
                                        function() {
                                            let listEnumerator = spItems.getEnumerator();
                                            items = [];

                                            let nodes = doc.querySelectorAll('ViewFields FieldRef');

                                            while (listEnumerator.moveNext()) {
                                                let list = listEnumerator.get_current();
                                                let item = {};

                                                for (let i = 0, nodeLength = nodes.length; i < nodeLength; i++) {
                                                    let field = nodes[i].getAttribute('Name');
                                                    let json = nodes[i].getAttribute('JSON');
                                                    item[field] = json ? JSON.parse(list.get_item(field)) : list.get_item(field);
                                                }

                                                items.push(item);
                                            }

                                            pageIndex = goToPage;
                                            items = items.slice((goToPage - 1) * pageSize);
                                            self.managePagerControl(goToPage);

                                            resolve({
                                                items,
                                                pageInformation
                                            });

                                        },
                                        function(sender, args) {
                                            reject('Failed to get items. Error:' + args.get_message());
                                        }
                                    );


                                } else {
                                    pageIndex === 1 ? camlQuery.set_listItemCollectionPosition(null) : camlQuery.set_listItemCollectionPosition(position);
                                    camlQuery.set_viewXml(`<View>${query.replace(/(\<View\>|\<\/View\>)/gi,'')}<RowLimit>${pageSize}</RowLimit></View>`);
                                    spItems = list.getItems(camlQuery);

                                    context.load(spItems);
                                    context.executeQueryAsync(
                                        function() {
                                            let listEnumerator = spItems.getEnumerator();
                                            items = [];

                                            let nodes = doc.querySelectorAll('ViewFields FieldRef');

                                            while (listEnumerator.moveNext()) {
                                                let list = listEnumerator.get_current();
                                                let item = {};

                                                for (let i = 0, nodeLength = nodes.length; i < nodeLength; i++) {
                                                    let field = nodes[i].getAttribute('Name');
                                                    let json = nodes[i].getAttribute('JSON');
                                                    item[field] = json ? JSON.parse(list.get_item(field)) : list.get_item(field);
                                                }

                                                items.push(item);
                                            }


                                            self.managePagerControl();
                                            resolve({
                                                items,
                                                pageInformation
                                            });

                                        },
                                        function(sender, args) {
                                            reject('Failed to get items. Error:' + args.get_message());
                                        }
                                    );
                                }



                            });


                        },
                        managePagerControl: function(pagerIndex) {


                            if (spItems.get_listItemCollectionPosition()) {
                                nextPagingInfo = spItems.get_listItemCollectionPosition().get_pagingInfo();
                            } else {
                                nextPagingInfo = null;
                            }

                            //The following code line shall add page information between the next and back buttons 
                            if (pagerIndex) {
                                pageInformation = (((pageIndex - 1) * pageSize) + 1) + " - " + spItems.get_count();
                            } else {
                                pageInformation = (((pageIndex - 1) * pageSize) + 1) + " - " + ((pageIndex * pageSize) - (pageSize - spItems.get_count()));
                            }

                            
                            //has an orderBy field
                            if(nextPagingInfo){
                                let nodes = doc.querySelectorAll('OrderBy FieldRef');
                                if (nodes.length > 0) {
                                    let [childNode] = nodes;
                                    let sortColumn = childNode.getAttribute('Name');
                                    previousPagingInfo = `PagedPrev=TRUE&Paged=TRUE&p_ID=${items[0].ID}&p_${sortColumn}=${encodeURIComponent(items[0][sortColumn])}`;
                                } else {
                                    previousPagingInfo = `PagedPrev=TRUE&Paged=TRUE&p_ID=${items[0].ID}`;
                                }
                            }


                        }
                    }

                },
                /**
                 * Find an user by ID
                 * @param  {Number} ID User ID of the user
                 * @return {(Promise<response>|Promise<Object>)}    Return either the User object or fail server response object
                 *
                 * @example
                 * //get the user with an ID of 11111
                 * spService.getUserByID(11111).then((response)=>{
                 *     console.log(response.data.d);
                 *     //the user object
                 * }, (error)=>{
                 *     
                 * })
                 */
                getUserByID: function(ID) {

                    if (!angular.isNumber(ID)) {
                        throw Error('ID should be type Int');
                    }

                    let deferred = $q.defer();
                    $http({
                        url: `${defaultDomain}/_api/web/getuserbyid(${ID})`,
                        method: 'GET',
                        headers: {
                            "Accept": "application/json; odata=verbose"
                        }
                    }).then(async(response) => {
                        try {
                            let { data: { d: { UserProfileProperties } } } = await this.getUserProfilePropertyFor(defaultDomain, (response.data.d.LoginName.split('\\').pop()));

                            deferred.resolve(
                                angular.merge(response, {
                                    data: {
                                        d: {
                                            UserProfileProperties
                                        }
                                    }
                                })
                            );

                        } catch (err) {
                            deferred.reject(err);
                        }

                    }, (response) => {
                        deferred.reject(response);
                    })

                    return deferred.promise;
                },
                /**
                 * Search for the user by account name
                 * @param  {String} accountName The account name of the user
                 * @return {(Promise<Object>|Promise<response>)}             Return an user object or server response object if fail to find
                 *
                 * @example
                 * spService.getUserProfilePropertyFor('jchou')
                 *     .then(
                 *         (response)=>{
                 *             console.log(response.data.d);
                 *             //return user object of user jchou
                 *         }, 
                 *         (error)=>{
                 *         
                 *         }
                 *     );
                 */
                getUserProfilePropertyFor: (accountName) => {

                    if (!angular.isString(accountName)) {
                        throw Error('accountName should be type string');
                    }

                    let deferred = $q.defer();

                    $http({
                        url: `${defaultDomain}/_api/SP.UserProfiles.PeopleManager/GetPropertiesFor(accountName=@v)?@v='mskcc\\${accountName}'&$select=UserProfileProperties`,
                        method: 'GET',
                        headers: {
                            "Accept": "application/json; odata=verbose"
                        }
                    }).then(
                        (response) => {

                            try {
                                let { data: { d: { UserProfileProperties: { results } } } } = response;

                                let UserProfileProperties = _.keyBy(results, 'Key');
                                delete response.data.d.UserProfileProperties.results;

                                deferred.resolve(angular.merge(response, {
                                    data: {
                                        d: {
                                            UserProfileProperties
                                        }
                                    }
                                }));

                            } catch (err) {

                                delete response.data.d.GetPropertiesFor;

                                deferred.resolve(angular.merge(response, {
                                    data: {
                                        d: {
                                            UserProfileProperties: null
                                        }
                                    }
                                }));
                            }
                        },
                        (response) => {
                            deferred.reject(response);
                        }
                    );

                    return deferred.promise;
                },
                /**
                 * Get the current Sharepoint user login
                 * @param  {String=} query Sharepoint OData query operations in Sharepoint Rest requests
                 * @return {(Promise<Object>|Promise<response>)} Return user object of current login user otherwise a Sharepoint failure response object
                 * @example
                 * //This will get the current user login to the system right now
                 * spService.getCurrentUser().then((response)=>console.log(response.data.d),(error)=>{});
                 */
                getCurrentUser: (query = '') => {
                    let deferred = $q.defer();

                    $http({
                        url: `${defaultDomain}/_api/SP.UserProfiles.PeopleManager/GetMyProperties${query}`,
                        method: 'GET',
                        headers: {
                            "Accept": "application/json; odata=verbose"
                        }
                    }).then((response) => {



                        let UserProfileProperties = _.keyBy(response.data.d.UserProfileProperties.results, 'Key');
                        delete response.data.d.UserProfileProperties.results;

                        deferred.resolve(angular.merge(response, {
                            data: {
                                d: {
                                    UserProfileProperties
                                }
                            }
                        }).data.d);

                    }, (response) => {
                        deferred.reject(response);
                    });

                    return deferred.promise;
                },
                /**
                 * Get the permission level of the current user
                 * @param  {String} url   The site domain
                 * @param  {String} query Sharepoint OData query operations in Sharepoint Rest requests
                 * @return {(Promise<response>|Promise<response>)}       Return the permission levels of an user
                 *
                 * @example
                 * //get the permission level of current user
                 * spService.getPermissionLevels('site/pub/forms', `?$filter=LoginName eq 'Forms Coordinators' or LoginName eq 'Forms Members'`).then((response)=>console.log(response.data.d),(error)=>{});
                 */
                getPermissionLevels: (url, query = '') => {
                    let deferred = $q.defer();

                    $http({
                        url: `${url}/_api/web/currentuser/groups${query}`,
                        method: "GET",
                        headers: {
                            "Accept": "application/json; odata=verbose"
                        }
                    }).then((response) => {
                        deferred.resolve(response.data.d.results);
                    }, (response) => {
                        deferred.reject(response);
                    });

                    return deferred.promise;

                },
                /**
                 * Add a list item into a list with optional attachments
                 * @param  {String}   url        The site domain of where the list is located
                 * @param  {String}   listname   The list name of where the list item should be added
                 * @param  {Object}   documents  A document object
                 * @param {Object} documents.metadata Metadata of document object matching with schema of the Sharepoint list column
                 * @param {Array<Object>} documents.AttachmentFiles Filelist attachments
                 * @param  {response} complete   Server response on successful add
                 * @param  {response} failure    Server response on error
                 * @param  {fileStatusResponse}  fileStatus
                 * @param  {uploadProgressCB}    The file upload progress
                 *
                 * @example
                 *
                 * let start = async () => {
                 *     const subdomain = '/sites/pub/forms';
                 *     const listName = 'Example';
                 *     let documentWithAttachments = {
                 *         metadata: { Title: 'Joe Smith', Gender: 'Male' },
                 *         AttachmentFiles: FILELIST //assume there is an array of files input
                 *     };
                 *
                 *     let documentWithOutAttachments = {
                 *         metadata: { Title: 'Joe Smith', Gender: 'Male' },
                 *         AttachmentFiles: []
                 *     };
                 *      
                 *     try {
                 *         //add an list item with an attachment
                 *         await spService.addListItem(subdomain, listName, documentWithAttachments,
                 *             (response) => {
                 *                 console.log(response);
                 *             },
                 *             (error) => {
                 *                 console.log(error)
                 *             },
                 *             (documentID, fileResponse, index)=>{
                 *                 console.log(documentID, fileResponse, index);
                 *             },
                 *             (progressEvent)=>{
                 *                 console.log(progresEvent);
                 *             }
                 *         );
                 *
                 *         //add an list item without an attachment
                 *         await spService.addListItem(subdomain, listName, documentWithOutAttachments,
                 *             (response) => {
                 *                 console.log(response);
                 *             },
                 *             (error) => {
                 *                 console.log(error)
                 *             }
                 *         );
                 *     
                 *     }
                 * }
                 *
                 * start();
                 */
                addListItem: async function(url, listname, documents, complete = () => {}, failure = () => {}, fileStatus, uploadProgressCB) {
                    // Prepping our update
                    let item = angular.extend({
                        "__metadata": {
                            "type": this.getListItemType(listname)
                        }
                    }, documents.metadata);

                    $http({
                        url: `${url}/_api/web/lists/getbytitle('${listname}')/items`,
                        method: "POST",
                        data: angular.toJson(item),
                        headers: {
                            "Content-Type": "application/json;odata=verbose",
                            "Accept": "application/json;odata=verbose",
                            "X-RequestDigest": await this.getDigestValue()
                        }
                    }).then((response) => {
                        if (documents.AttachmentFiles) {
                            if (documents.AttachmentFiles.length === 0) {
                                complete(response);
                            } else {
                                complete(response);
                                this.addListFileAttachments(url, listname, response.data.d.ID, {
                                        files: documents.AttachmentFiles,
                                        prefix: documents.prefix || ''
                                    },
                                    (status, index) => {
                                        fileStatus(response.data.d.ID, status, index);
                                    },
                                    (progressEvent)=>{
                                        uploadProgressCB(progressEvent)
                                    });

                            }
                        } else {
                            complete(response);
                        }
                    }, (response) => {
                        failure(response);
                    });


                },
                /**
                 * Add multiple list items into a list with optional attachments
                 * @param  {String}   url        The site domain of where the list is located
                 * @param  {String}   listname   The list name of where the list item should be added
                 * @param  {Array<Object>}   itemsToAdd  An array of document object
                 * @param {Array<Object>=} itemsToAdd.AttachmentFiles Filelist attachments
                 * @param  {response} complete   Server response on successful add
                 * @param  {response} failure    Server response on error
                 * @param  {fileStatusResponse}   fileStatus
                 *
                 * @example
                 *
                 * let start = async () => {
                 *     const subdomain = '/sites/pub/forms';
                 *     const listName = 'Example';
                 *
                 *     //assume there are an array of files in the variable FILELIST
                 *     let documentWithAttachments = [
                 *         { Title: 'Joe Smith', Gender: 'Male', AttachmentFiles: FILELIST },
                 *         { Title: 'Alice Goldberg', Gender: 'Female' },
                 *         { Title: 'Harry Thompson', Gender: 'Male', AttachmentFiles: FILELIST }
                 *     ];
                 *
                 *     try {
                 *         //add an list item with an attachment or no attachment
                 *         await spService.addListItems(subdomain, listName, documentWithAttachments,
                 *             (response, index) => {
                 *                 console.log(response, index);
                 *             },
                 *             (error, index) => {
                 *                 console.log(error, index);
                 *             },
                 *             (documentID, fileResponse, index)=>{
                 *                 console.log(documentID, fileResponse, index);
                 *             }
                 *         );
                 *
                 *     
                 *     } catch(err){
                 *     
                 *     }
                 * }
                 *
                 * start();
                 */                
                addListItems: function(url, listname, itemsToAdd, complete = () => {}, failure = () => {}, fileStatus, uploadProgressCB) {


                    if (!angular.isArray(itemsToAdd)) {
                        throw Error("Third Param need to be an Array");
                    }

                    if (itemsToAdd.length === 0) {
                        throw Error("Third Param needs element in the Array");
                    }

                    let deferred = $q.defer();

                    let addItem = async(i) => {
                        if (itemsToAdd.length !== i) {

                            let AttachmentFiles = [];

                            //check if there are attachments
                            if (!angular.isUndefined(itemsToAdd[i].AttachmentFiles)) {
                                //there is an attachment
                                AttachmentFiles = itemsToAdd[i].AttachmentFiles;
                                delete itemsToAdd[i].AttachmentFiles;
                            }


                            let item = angular.extend({
                                "__metadata": {
                                    "type": this.getListItemType(listname)
                                }
                            }, itemsToAdd[i]);


                            $http({
                                url: `${url}/_api/web/lists/getbytitle('${listname}')/items`,
                                method: "POST",
                                data: angular.toJson(item),
                                headers: {
                                    "Content-Type": "application/json;odata=verbose",
                                    "Accept": "application/json;odata=verbose",
                                    "X-RequestDigest": await this.getDigestValue()
                                }
                            }).then(async(response) => {

                                if (AttachmentFiles.length === 0) {
                                    complete(response, i);
                                } else {
                                    //there are attachments
                                    complete(response, i);
                                    await this.addListFileAttachments(url, listname, response.data.d.ID, { files: AttachmentFiles, prefix: '' }, (status, index) => {
                                        fileStatus(response.data.d.ID, status, index);
                                    },
                                    (progressEvent) => {
                                        uploadProgressCB(progressEvent);
                                    });
                                }

                                addItem(i + 1);

                            }, (response) => {
                                failure(response, i);
                                deferred.resolve(false);
                            });
                        } else {
                            //return a bool if function is done
                            deferred.resolve(true);
                        }
                    };

                    addItem(0);

                    return deferred.promise;

                },
                /**
                 * Add multiple list items into a list with optional attachments
                 * @param  {String}   url        The site domain of where the list is located
                 * @param  {String}   listname   The list name of where the list item should be updated
                 * @param {Number} id The document id to update
                 * @param {Object} metadata The document metadata to update according to the fieldnames
                 * @return {Promise<response>} The server response if document was updated successfully
                 *
                 * @example
                 * //update the document with an ID of 7 and changing the Title to Hello World
                 * spService.updateListItem('sites/pub/forms', 'Example', 7, {'Title':'Hello World'})
                 *     .then(
                 *         (response)=>{
                 *             console.log('successful update');
                 *         },
                 *         (error)=>{
                 *         
                 *         }
                 *     );
                 */                  
                updateListItem: async function(url, listname, id, metadata) {

                    let deferred = $q.defer();

                    //this will update the list item on restful api on sharepoint
                    let item = angular.extend({
                        "__metadata": {
                            "type": this.getListItemType(listname)
                        }
                    }, metadata);

                    $http({
                        url: `${url}/_api/web/lists/getbytitle('${listname}')/items(${id})`,
                        method: "POST",
                        data: angular.toJson(item),
                        headers: {
                            "Accept": "application/json;odata=verbose",
                            "Content-Type": "application/json;odata=verbose",
                            "X-RequestDigest": await this.getDigestValue(),
                            "X-HTTP-Method": "MERGE",
                            "If-Match": "*"
                        }
                    }).then((response) => {
                        deferred.resolve(response);
                    }, (response) => {
                        deferred.reject(response);
                    });

                    return deferred.promise;

                },
                /**
                 * Updates multiple list items
                 * @param  {String}   url           The site domain of where the list is located
                 * @param  {String}   listname      The list name of where the list items should be updated
                 * @param {Array<Object>} itemsToUpdate A list of documents to update. It will need an ID to identify the documents
                 * @param  {responseWithIndex} complete      A successful update with an index counter
                 * @param  {responseWithIndex} failure       A fail update with an index counter of what document cause the issue
                 * @return {Promise<Boolean>}                 Return true when documents are completely updated
                 *
                 * @example
                 * //Update multiple list items in a Sharepoint list starting with list items with the ID of 1 and 2
                 * let documents = [
                 *     {ID: 1, Title: 'Example of title change', Category: 'General'},
                 *     {ID: 2, Title: 'Example of another title change'}
                 * ];
                 * 
                 * spService.updateListItems('/sites/pub/forms', 'Example', documents,
                 *     (response, index)=>{
                 *         if(documents.length === index) {
                 *             console.log('Completed updating all documents');
                 *         }
                 *     },
                 *     (error, index)=>{
                 *     
                 *     }
                 * );
                 */
                updateListItems: function(url, listname, itemsToUpdate, complete = () => {}, failure = () => {}) {

                    if (!angular.isArray(itemsToUpdate)) {
                        throw Error("Third Param need to be an Array");
                    }

                    if (itemsToUpdate.length === 0) {
                        throw Error("Third Param needs element in the Array");
                    }

                    let deferred = $q.defer();

                    let updateItem = async(i) => {

                        if (itemsToUpdate.length !== i) {

                            let ID = itemsToUpdate[i].ID;
                            delete itemsToUpdate[i].ID;

                            let item = angular.extend({
                                "__metadata": {
                                    "type": this.getListItemType(listname)
                                }
                            }, itemsToUpdate[i]);

                            $http({
                                url: `${url}/_api/web/lists/getbytitle('${listname}')/items(${ID})`,
                                method: "POST",
                                data: angular.toJson(item),
                                headers: {
                                    "Accept": "application/json;odata=verbose",
                                    "Content-Type": "application/json;odata=verbose",
                                    "X-RequestDigest": await this.getDigestValue(),
                                    "X-HTTP-Method": "MERGE",
                                    "If-Match": "*"
                                }
                            }).then((response) => {
                                complete(response, i);
                                updateItem(i + 1);
                            }, (response) => {
                                failure(response, i);
                                deferred.resolve(false);
                            });
                        } else {
                            //return a bool if function is done
                            deferred.resolve(true);
                        }

                    }

                    updateItem(0);


                    return deferred.promise;

                },
                /**
                 * Delete an list item base on ID
                 * @param  {String} url      The site domain of where to delete the list item
                 * @param  {String} listname The list name of where the list items are located
                 * @param  {Number} id       The id of the document to delete
                 * @return {Promise<response>}          The server response on successful deletion or failure
                 *
                 * @example
                 * //delete a document with an id of 5
                 * spService.deleteListItem('sites/pub/form', 'Example', 5)
                 *     .then(
                 *         (response)=>{
                 *             console.log('Deletion Successful');
                 *         },
                 *         (error)=>{
                 *         }
                 *     );
                 */
                deleteListItem: async function(url, listname, id) {
                    // getting our item to delete, then executing a delete once it's been returned
                    let deferred = $q.defer();

                    $http({
                        url: `${url}/_api/web/lists/getbytitle('${listname}')/items(${id})`,
                        method: "POST",
                        headers: {
                            "Accept": "application/json;odata=verbose",
                            "X-Http-Method": "DELETE",
                            "X-RequestDigest": await this.getDigestValue(),
                            "If-Match": "*"
                        }

                    }).then((response) => {
                        deferred.resolve(response);
                    }, (response) => {
                        deferred.reject(response);
                    });

                    return deferred.promise;

                },
                /**
                 * Delete multiple list items on a Sharepoint list
                 * @param  {String}   url           The subdomain of where the list items are located
                 * @param  {String}   listname      The list name of where the list items are located 
                 * @param  {Array<Number>}   itemsToDelete An array of list item ID
                 * @param  {responseWithIndex} complete      A server response on successful deletion with an index counter
                 * @param  {responseWithIndex} failure       A server response on failure to delete with an index counter
                 * @return {Promise<boolean>}                 Returns true when all list items are successfully deleted
                 *
                 * @example
                 * //this will delete the list items that contains the id 1,2,3 on the 'Example' list located at '/sites/pub/forms'
                 * let documents = [1,2,3];
                 * 
                 * spService.deleteListItems('/sites/pub/forms', 'Example', documents, 
                 *     (response, index)=>{
                 *         if(documents.length === index){
                 *             console.log('finish deleting items');
                 *         }
                 *     },
                 *     (response, index)=>{
                 *     
                 *     }
                 * );
                 */
                deleteListItems: function(url, listname, itemsToDelete, complete = () => {}, failure = () => {}) {

                    if (!angular.isArray(itemsToDelete)) {
                        throw Error("Third Param need to be an Array");
                    }

                    if (itemsToDelete.length === 0) {
                        throw Error("Third Param needs element in the Array");
                    }

                    let deferred = $q.defer();

                    let deleteItem = async(i) => {

                        if (itemsToDelete.length !== i) {
                            $http({
                                url: `${url}/_api/web/lists/getbytitle('${listname}')/items(${itemsToDelete[i]})`,
                                method: "POST",
                                headers: {
                                    "Accept": "application/json;odata=verbose",
                                    "X-Http-Method": "DELETE",
                                    "X-RequestDigest": await this.getDigestValue(),
                                    "IF-MATCH": "*"
                                }

                            }).then((response) => {
                                complete(response, i);
                                deleteItem(i + 1);
                            }, (response) => {
                                failure(response, i);
                                deferred.resolve(false);
                            });
                        } else {
                            deferred.resolve(true);
                        }

                    }

                    deleteItem(0);


                    return deferred.promise;

                }
            };

        }
    }
};

/**
 * This callback is displayed as a global member.
 * @callback response
 * @param {Object} complete A successful Sharepoint response
 */

/**
 * @callback responseWithIndex
 * @param {Object} complete A successful Sharepoint response
 * @param {Number} index Number of response completed
 */

/**
 * @callback fileStatusResponse
 * @param {Number} id The list item ID of where the file attachment was attached
 * @param {response} complete A server response on successful file upload
 * @param {Number} index Number of successful file upload
 */

/**
 * @callback progressCB
 * @param {Number} progress Progress of file upload/download
 */

