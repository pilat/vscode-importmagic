from whoosh.analysis import Filter, LowercaseFilter, StandardAnalyzer, \
    NgramFilter
from whoosh.analysis.tokenizers import IDTokenizer
from whoosh.fields import NUMERIC, STORED, SchemaClass, TEXT


class LodashFilter(Filter):
    def __call__(self, tokens):
        for t in tokens:
            t.text = t.text.replace('_', '')
            yield t


simple_ana = IDTokenizer() | LowercaseFilter() | LodashFilter()
custom_ana = StandardAnalyzer(stoplist=None) | LodashFilter()
# | NgramFilter(minsize=2, maxsize=5, at='start')
# The sort problems with NgramFilter: less relevant artefacts will be first

class IndexSchema(SchemaClass):
    filename = TEXT(stored=True, analyzer=simple_ana)
    symbol = TEXT(stored=True, analyzer=custom_ana)
    module = TEXT(stored=True, analyzer=simple_ana)
    location = STORED()
    kind = STORED()
    sort = NUMERIC(sortable=True)

