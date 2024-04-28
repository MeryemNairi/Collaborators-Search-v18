import * as React from 'react';
import { useEffect, useState } from 'react';
import styles from "./Directory.module.scss";
import { PersonaCard } from "./PersonaCard/PersonaCard";
import { spservices } from "../../../SPServices/spservices";
import { IDirectoryState } from "./IDirectoryState";
import * as strings from "DirectoryWebPartStrings";
import {
   SearchBox, PivotItem, IDropdownOption} from "office-ui-fabric-react";
import {IStackTokens } from 'office-ui-fabric-react/lib/Stack';
import { debounce } from "throttle-debounce";
import { ISPServices } from "../../../SPServices/ISPServices";


const LogoSVG = (
  <svg width="42" height="38" viewBox="0 0 42 38" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M0 14.3725L16.0031 0H34.002C38.4186 0 42 3.24086 42 7.23749V23.5186L25.997 38V18.8559C25.997 16.3644 23.7603 14.3533 21.0071 14.3661H0.00708477L0 14.3725Z" fill="white" />
  </svg>
);



import { IDirectoryProps } from './IDirectoryProps';
//import Paging from './Pagination/Paging';
import Navbar from './Navbar/Navbar';


const wrapStackTokens: IStackTokens = { childrenGap: 30 };

const DirectoryHook: React.FC<IDirectoryProps> = (props) => {
  const _services: ISPServices = new spservices(props.context);
  const [az, setaz] = useState<string[]>([]);
  const [alphaKey, setalphaKey] = useState<string>('A');
  const [state, setstate] = useState<IDirectoryState>({
    users: [],
    isLoading: true,
    errorMessage: "",
    hasError: false,
    indexSelectedKey: "A",
    searchString: "LastName",
    searchText: "",
    searchSuggestions: [] // Ajout de la propriété searchSuggestions
  });

  const orderOptions: IDropdownOption[] = [
    { key: "FirstName", text: "First Name" },
    { key: "LastName", text: "Last Name" },
    { key: "Department", text: "Department" },
    { key: "Location", text: "Location" },
    { key: "JobTitle", text: "Job Title" }
  ];
  const color = props.context.microsoftTeams ? "white" : "";
  // Paging
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [pagedItems, setPagedItems] = useState<any[]>([]);
  const [pageSize, setPageSize] = useState<number>(props.pageSize ? props.pageSize : 10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const _onPageUpdate = async (pageno?: number): Promise<void> => {
    const currentPge = (pageno) ? pageno : currentPage;
    const startItem = ((currentPge - 1) * pageSize);
    const endItem = currentPge * pageSize;
    const filItems = state.users.slice(startItem, endItem);
    setCurrentPage(currentPge);
    setPagedItems(filItems);
  };

  const diretoryGrid =
    pagedItems && pagedItems.length > 0
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? pagedItems.map((user: any, i) => {
        return (
          <PersonaCard
            context={props.context}
            key={"PersonaCard" + i}
            profileProperties={{
              DisplayName: user.PreferredName,
              Title: user.JobTitle,
              PictureUrl: user.PictureURL,
              Email: user.WorkEmail,
              Department: user.Department,
              WorkPhone: user.WorkPhone,
              Location: user.OfficeNumber
                ? user.OfficeNumber
                : user.BaseOfficeLocation
            }}
          />
        );
      })
      : [];
  const _loadAlphabets = (): void => {
    const alphabets: string[] = [];
    for (let i = 65; i < 91; i++) {
      alphabets.push(
        String.fromCharCode(i)
      );
    }
    setaz(alphabets);
  };

  const _alphabetChange = async (item?: PivotItem): Promise<void> => {
    setstate({ ...state, searchText: "", indexSelectedKey: item.props.itemKey, isLoading: true });
    setalphaKey(item.props.itemKey);
    setCurrentPage(1);
  };
  const _searchByAlphabets = async (initialSearch: boolean): Promise<void> => {
    setstate({ ...state, isLoading: true, searchText: '' });
    let users = null;
    if (initialSearch) {
      if (props.searchFirstName)
        users = await _services.searchUsersNew('', `FirstName:a*`, false);
      else users = await _services.searchUsersNew('a', '', true);
    } else {
      if (props.searchFirstName)
        users = await _services.searchUsersNew('', `FirstName:${alphaKey}*`, false);
      else users = await _services.searchUsersNew(`${alphaKey}`, '', true);
    }
    setstate({
      ...state,
      searchText: '',
      indexSelectedKey: initialSearch ? 'A' : state.indexSelectedKey,
      users:
        users && users.PrimarySearchResults
          ? users.PrimarySearchResults
          : null,
      isLoading: false,
      errorMessage: "",
      hasError: false
    });
  };

  const _searchUsers = async (searchText: string): Promise<void> => {
    try {
      setstate({ ...state, searchText: searchText, isLoading: true });
      if (searchText.length > 0) {
        const searchProps: string[] = props.searchProps && props.searchProps.length > 0 ?
          props.searchProps.split(',') : ['FirstName', 'LastName', 'WorkEmail', 'Department'];
        let qryText = '';
        const finalSearchText: string = searchText ? searchText.replace(/ /g, '+') : searchText;
        if (props.clearTextSearchProps) {
          const tmpCTProps: string[] = props.clearTextSearchProps.indexOf(',') >= 0 ? props.clearTextSearchProps.split(',') : [props.clearTextSearchProps];
          if (tmpCTProps.length > 0) {
            searchProps.map((srchprop, index) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const ctPresent: any[] = tmpCTProps.filter((o) => { return o.toLowerCase() === srchprop.toLowerCase(); });
              if (ctPresent.length > 0) {
                if (index === searchProps.length - 1) {
                  qryText += `${srchprop}:${searchText}*`;
                } else qryText += `${srchprop}:${searchText}* OR `;
              } else {
                if (index === searchProps.length - 1) {
                  qryText += `${srchprop}:${finalSearchText}*`;
                } else qryText += `${srchprop}:${finalSearchText}* OR `;
              }
            });
          } else {
            searchProps.map((srchprop, index) => {
              if (index === searchProps.length - 1)
                qryText += `${srchprop}:${finalSearchText}*`;
              else qryText += `${srchprop}:${finalSearchText}* OR `;
            });
          }
        } else {
          searchProps.map((srchprop, index) => {
            if (index === searchProps.length - 1)
              qryText += `${srchprop}:${finalSearchText}*`;
            else qryText += `${srchprop}:${finalSearchText}* OR `;
          });
        }
        console.log(qryText);
        const users = await _services.searchUsersNew('', qryText, false);
        setstate({
          ...state,
          searchText: searchText,
          indexSelectedKey: '0',
          users:
            users && users.PrimarySearchResults
              ? users.PrimarySearchResults
              : null,
          isLoading: false,
          errorMessage: "",
          hasError: false
        });
        setalphaKey('0');
      } else {
        setstate({ ...state, searchText: '' });
        await _searchByAlphabets(true);
      }
    } catch (err) {
      setstate({ ...state, errorMessage: err.message, hasError: true });
    }
  };
  const _debouncesearchUsers = debounce(500, _searchUsers);

  const _searchBoxChanged = (newvalue: string): void => {
    setCurrentPage(1);
    _debouncesearchUsers(newvalue);
  };


  const _sortPeople = async (sortField: string): Promise<void> => {
    let _users = [...state.users];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _users = _users.sort((a: any, b: any) => {


      switch (sortField) {

        // Sort by Location
        case "Location":
          if ((a.BaseOfficeLocation || "").toUpperCase() < (b.BaseOfficeLocation || "").toUpperCase()) {
            return -1;
          }
          if ((a.BaseOfficeLocation || "").toUpperCase() > (b.BaseOfficeLocation || "").toUpperCase()) {
            return 1;
          }
          return 0;

          break;
          break;

        default:
          if ((a[sortField] || "").toUpperCase() < (b[sortField] || "").toUpperCase()) {
            return -1;
          }
          if ((a[sortField] || "").toUpperCase() > (b[sortField] || "").toUpperCase()) {
            return 1;
          }
          return 0;

          break;
      }
    });
    setstate({ ...state, users: _users, searchString: sortField });
  };

  useEffect(() => {
    setPageSize(props.pageSize);
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    if (state.users) { _onPageUpdate() }
  }, [state.users, props.pageSize]);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    if (alphaKey.length > 0 && alphaKey !== "0") _searchByAlphabets(false);
  }, [alphaKey]);

  useEffect(() => {
    _loadAlphabets();
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    _searchByAlphabets(true);
  }, [props]);

  const handleSearchBoxChanged = (newvalue: string): void => {
    setCurrentPage(1);
    _debouncesearchUsers(newvalue);
  };

  return (
    <div className={styles.directory}>

      {/* Barre de recherche */}
      <div className={styles.header}>
        <div className={styles.serchWrap}>
          <SearchBox
            placeholder={strings.SearchPlaceHolder}
            className={styles.searchTextBox}
            onSearch={_searchUsers}
            value={state.searchText}
            onChange={(ev, newVal) => handleSearchBoxChanged(newVal)}
          />
          {/* Ajoutez le logo SVG à droite de la barre de recherche */}
          <div className={styles.logo}>{LogoSVG}</div>
          {state.searchText.length > 0 && pagedItems.length > 0 && (
            <div id="auto-suggest" >
              <ul className={styles.suggestions}>
                {pagedItems.map((user, index) => (
                  <li key={index} className={styles.suggestion}>
                    {/* Afficher les détails de l'utilisateur ici */}
                    <PersonaCard
                      context={props.context}
                      key={"PersonaCard" + index}
                      profileProperties={{
                        DisplayName: user.PreferredName,
                        Title: user.JobTitle,
                        PictureUrl: user.PictureURL,
                        Email: user.WorkEmail,
                        Department: user.Department,
                        WorkPhone: user.WorkPhone,
                        Location: user.OfficeNumber
                          ? user.OfficeNumber
                          : user.BaseOfficeLocation
                      }}
                    />
                  </li>
                ))}
              </ul>

            </div>
          )}
        </div>
      </div>
      <div>
        <Navbar /> {/* Ajoutez le composant Navbar ici */}
      </div>
    </div>
  );




};

export default DirectoryHook;
