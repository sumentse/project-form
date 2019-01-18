// @ngInject
export default ($state, $rootScope, $scope, $filter, $async, spService, CSV, modal, CONST) => {

  $rootScope.setPageName('All Submitted Projects');

  angular.merge($scope, {
    filterState: {
      searchTitle: '',
      formStatus: '',
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

  $scope.downloadCSV = () => {
    spService.getListItems(CONST.rootFolder, CONST.LISTS.form, '?$top=5000',
      (response) => {
        let data = response.data.d.results;

        try {
          let formattedData = data.map((row) => {
            return {
              project_title: row.project_title,
              project_leader: row.project_leader,
              contact_person: row.contact_person,
              team_members: JSON.parse(row.team_members).map((member) => {
                let {
                  name,
                  jobTitle,
                  department
                } = member;
                return `${name}/${department} (${jobTitle}) `;
              }).join(', '),
              departments_involved: row.departments_involved,
              need_assessment: row.need_assessment,
              project_goals: row.project_goals,
              changes_made: row.changes_made,
              impact_made: row.impact_made,
              discussion: row.discussion,
              green_friendly: row.green_friendly,
              green_friendly_describe: row.green_friendly_describe,
              has_supporting_documents: row.has_supporting_documents,
              file_attachments: row.file_attachments,
              Modified: $filter('date')(row.Modified, 'medium')
            }
          });

          CSV.export(formattedData);

        } catch (err) {
          console.log('something went wrong with parsing\n', err);
        }



      },
      (error) => {

      }
    );
  };

  $scope.deleteItem = (id)=>{
    modal.confirmation($async(async(userAnswer)=>{
      
      if(userAnswer === true){
        await spService.deleteListItem(CONST.rootFolder, CONST.LISTS.form, id);
        $scope.$broadcast('refreshTable', {
          project_title: $scope.filterState.searchTitle,
          project_leader: $scope.filterState.projectLeader,
          contact_person: $scope.filterState.contactPerson,
          form_status: $scope.filterState.formStatus
        });        
      }
      
    }));
  };

  $scope.clearFilters = () => {

    angular.extend($scope.filterState, {
      searchTitle: '',
      projectLeader: '',
      contactPerson: '',
      formStatus: ''
    });

    //needs to do a broadcast
    $scope.$broadcast('refreshTable', {
      project_title: $scope.filterState.searchTitle,
      project_leader: $scope.filterState.projectLeader,
      contact_person: $scope.filterState.contactPerson,
      form_status: $scope.filterState.formStatus
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
    let where = '';

    if ($scope.filterState.formStatus) {
      where = `
        <Where>
          <Eq>
            <FieldRef Name='form_status'></FieldRef>
            <Value Type='text'>${$scope.filterState.formStatus}</Value>
          </Eq>
        </Where>
      `;
    }

    let query = new spService.camlQuery(CONST.rootFolder, {
      listName: CONST.LISTS.form,
      pageSize: 1000
    });
    query.setXML(
      `
        <Query>
            <ViewFields>
                <FieldRef Name='ID'/>
                <FieldRef Name='Modified'/>
                <FieldRef Name='project_title'/>
                <FieldRef Name='project_leader'/>
                <FieldRef Name='contact_person'/>
                <FieldRef Name='form_status'/>
                <FieldRef Name='has_supporting_documents'/>
                <FieldRef Name='team_members' JSON='true'/>
                <FieldRef Name='green_friendly'/>
                <FieldRef Name='file_attachments' JSON='true'/>
            </ViewFields>
            ${where}
        </Query>
    `);

    try {
      const {
        items
      } = await query.GetListItems(0);

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

    } catch (err) {

    }

  });


};