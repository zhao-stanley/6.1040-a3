<concept_spec>
concept AIFilter [Item]

purpose
    enable search through collections using natural language queries,
    with fallback to manual filtering

principle
    after providing a natural language query, the AI converts climbing terminology
    into structured filter criteria; users can also set criteria manually

state
    a set of Filters with
        a filterId String
        a criteria mapping from String to set of Strings
        a naturalQuery String  // optional natural language query

actions
    createFilter(): (filter: Filter)
        effect
            generate unique filterId
            create filter with empty criteria and naturalQuery
            return the created filter

    async parseQuery(filter: Filter, query: String, llm: GeminiLLM): Boolean
        requires filter exists
        effect uses llm to convert query into structured criteria
               if successful: update filter.criteria and set filter.naturalQuery = query
               return success status

    addCriteria(filter: Filter, key: String, values: set of Strings)
        requires filter exists
        effect add or update criteria[key] = values in filter

    search(filter: Filter, items: set of Items): (results: set of Items)
        requires filter exists
        effect return items that match all criteria in filter

    clearFilter(filter: Filter)
        requires filter exists
        effect remove all criteria and clear naturalQuery

notes
    Designed for climbing route search with terminology like grade, wall angle, 
    hold types, and training goals
</concept_spec>
