// @ngInject
export default ($state, $rootScope, $scope, $filter, $async, spService, modal, CONST) => {

    $rootScope.setPageName('All Submitted Presentations');
  
    angular.merge($scope, {
      filterState: {
        searchTitle: ''
      },
      tableState: {
        colLength: (document.querySelector('#column-names')) ? document.querySelector('#column-names').childElementCount : 0,
        display: [],
        srcDisplay: []
      }
    });
  
    $scope.reload = ()=>{
      $state.reload();
    };
  
    $scope.deleteItem = (id)=>{
      modal.confirmation($async(async(userAnswer)=>{
        
        if(userAnswer === true){
          await spService.deleteListItem(CONST.rootFolder, CONST.LISTS.template, id);
          $scope.$broadcast('refreshTable', {
            Title: $scope.filterState.searchTitle
          });        
        }
        
      }));
    };
  
    $scope.clearFilters = () => {
  
      angular.extend($scope.filterState, {
        searchTitle: ''
      });
  
      //needs to do a broadcast
      $scope.$broadcast('refreshTable', {
        Title: $scope.filterState.searchTitle
      });
  
    };
  
    $scope.customPipe = $async(async (tableState) => {
  
      let {
        pagination,
        search,
        sort
      } = tableState;
      let start = pagination.start || 0;
      let number = pagination.number || 25;
  
      spService.getListItems(CONST.rootFolder, CONST.LISTS.template, `?$expand=AttachmentFiles&$top=2000`,
        (response)=>{
            let items = response.data.d.results;

            angular.extend($scope.tableState, {
                display: search.predicateObject ? $filter('filter')(items, search.predicateObject) : items
              });
        
              //Handles sorting for column header
              if (sort.predicate) {
                angular.extend(
                  $scope.tableState, {
                    display: $filter('orderBy')($scope.tableState.display, sort.predicate, sort.reverse)
                  }
                );
              }
        
              //pagination
              angular.merge(tableState, {
                pagination: {
                  totalItemCount: $scope.tableState.display.length,
                  numberOfPages: Math.ceil($scope.tableState.display.length / number)
                }
              });
        
              angular.extend(
                $scope.tableState, {
                  display: $scope.tableState.display.slice(start, start + number)
                }
              );
        },
        (error)=>{

        }
      );

    });
  
  
  };